import {
  Logger,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  BUFFER_MS,
  makeOrderStopKey,
  makeDriverPingKey,
} from './common/constants';
import { CreateOrderDto, AssignDriverDto, DriverPingDto } from './common/dtos';

import {
  H3Service,
  RedisService,
  DatabaseService,
  AppConfigService,
} from '../../core';
import { OrderStatus } from '../../../generated/prisma/enums';

type CachedStop = {
  id: string;
  cellId: string;
  sequence: number;
};

@Injectable()
export class OrdersService {
  private logger = new Logger(OrdersService.name);

  private readonly limit = 10;

  constructor(
    private readonly h3Service: H3Service,
    private readonly redisService: RedisService,
    private readonly configService: AppConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  private async cacheStop(orderId: string, stop: CachedStop) {
    const setStop = await this.redisService.set(makeOrderStopKey(orderId), {
      id: stop.id,
      cellId: stop.cellId,
      sequence: stop.sequence,
    } satisfies CachedStop);

    return setStop;
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    const stops = dto.stops.map((c, i) => {
      const cellId = this.h3Service.latLngToCell(c.latitude, c.longitude, 9);

      if (!cellId.success) {
        this.logger.warn({
          message: 'Failed to get cellId',
          error: cellId.error,
        });

        throw new BadRequestException('Invalid coordinates');
      }

      return {
        sequence: i + 1,
        name: c.name,
        address: c.address,
        latitude: c.latitude,
        cellId: cellId.data,
        longitude: c.longitude,
      };
    });

    const order = await this.databaseService.order.create({
      data: {
        customerId: customerId,
        stops: {
          createMany: {
            data: stops,
          },
        },
        details: {
          description: dto.details.description,
          weight: dto.details.weight,
          value: dto.details.value,
        },
      },
    });

    return { orderId: order.id };
  }

  async assignDriver(orderId: string, driverId: string, dto: AssignDriverDto) {
    const vehicle = await this.databaseService.vehicle.findUnique({
      where: { id: dto.vehicleId, driverId },
    });

    if (!vehicle) {
      this.logger.warn({
        message: 'Driver does not own this vehicle',
      });

      throw new BadRequestException('Driver does not own this vehicle');
    }

    await this.databaseService.$transaction(async (tx) => {
      const driverIsAvailable = await tx.driver.findFirst({
        where: {
          id: driverId,
          isAvailable: true,
        },
      });

      if (!driverIsAvailable) {
        this.logger.warn({
          message: 'Driver is not available',
        });

        throw new BadRequestException('Driver is not available');
      }

      const order = await tx.$queryRaw<{ id: string; status: OrderStatus }[]>`
      SELECT id, status FROM orders 
      WHERE id = ${orderId} 
      FOR UPDATE
    `;

      if (!order.length) {
        throw new NotFoundException('Order not found');
      }

      if (order[0].status !== 'PENDING') {
        throw new BadRequestException('Order is already assigned');
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          driverId,
          status: 'IN_PROGRESS',
          vehicleId: vehicle.id,
        },
      });

      await tx.driver.update({
        where: { id: driverId },
        data: {
          isAvailable: false,
        },
      });

      const firstStop = await tx.stop.findFirstOrThrow({
        where: { orderId, sequence: 1 },
      });

      const setFirstStop = await this.cacheStop(orderId, {
        id: firstStop.id,
        cellId: firstStop.cellId,
        sequence: firstStop.sequence,
      });

      if (!setFirstStop) {
        this.logger.error({
          message: 'Failed to set first stop in Redis',
        });

        throw new InternalServerErrorException();
      }
    });

    return { message: 'success' };
  }

  async driverPing(driverId: string, orderId: string, dto: DriverPingDto) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId, driverId, status: 'IN_PROGRESS' },
    });

    if (!order) {
      this.logger.warn({
        message: 'Order not found or not assigned to driver',
      });

      throw new NotFoundException('Order not found or not assigned to driver');
    }

    const convertCoordsToCell = this.h3Service.latLngToCell(
      dto.lat,
      dto.lng,
      9,
    );

    if (!convertCoordsToCell.success) {
      this.logger.error({
        message: 'Failed to convert coords',
        error: convertCoordsToCell.error,
      });

      throw new InternalServerErrorException();
    }

    const cellId = convertCoordsToCell.data;

    const cachedStop = await this.redisService.get<CachedStop>(
      makeOrderStopKey(orderId),
    );

    if (!cachedStop.success) {
      this.logger.error({
        message: `Failed to get current stop for orderId:${orderId} from cache`,
        error: cachedStop.error,
      });

      throw new InternalServerErrorException();
    }

    let currentStop = cachedStop.data;

    if (!currentStop) {
      this.logger.warn({
        message: `Cache Miss for orderId:${orderId}, fetching current stop from db`,
      });

      currentStop = await this.databaseService.stop.findFirst({
        where: {
          orderId,
          status: 'PENDING',
        },
        orderBy: {
          sequence: 'asc',
        },
        select: {
          id: true,
          cellId: true,
          sequence: true,
        },
        take: 1,
      });

      if (!currentStop) {
        this.logger.log({
          message: `No pending stops found for orderId:${orderId}, order completed.`,
        });

        await this.databaseService.$transaction(async (tx) => {
          await tx.order.update({
            where: {
              id: orderId,
            },
            data: {
              status: 'COMPLETED',
            },
          });

          await tx.driver.update({
            where: {
              id: driverId,
            },
            data: {
              isAvailable: true,
            },
          });

          const deletedStop = await this.redisService.delete(
            makeOrderStopKey(orderId),
          );

          if (!deletedStop.success) {
            this.logger.error({
              message: `Failed to delete current stop for orderId:${orderId} from cache`,
              error: deletedStop.error,
            });
          }
        });

        return { message: 'order completed' };
      }

      const cachedStop = await this.cacheStop(orderId, currentStop);

      if (!cachedStop.success) {
        this.logger.error({
          message: `Failed to cache current stop for orderId:${orderId}`,
          error: cachedStop.error,
        });
      }
    }

    const matches = cellId === currentStop.cellId;

    if (!matches) {
      return { message: 'success' };
    }

    const totalPingsRequired = this.configService.TOTAL_PINGS_REQUIRED;
    const pingInterval = this.configService.PING_INTERVAL_MS;

    if (!totalPingsRequired.success || !totalPingsRequired.data) {
      this.logger.error({
        message: `TOTAL_PINGS_REQUIRED is not defined`,
        error: totalPingsRequired.error,
      });

      throw new InternalServerErrorException();
    }

    if (!pingInterval.success || !pingInterval.data) {
      this.logger.error({
        message: `PING_INTERVAL is not defined`,
        error: pingInterval.error,
      });

      throw new InternalServerErrorException();
    }

    const cacheTTlSecs =
      (totalPingsRequired.data * pingInterval.data + BUFFER_MS) / 1000;
    const totalPings = await this.redisService.increment(
      makeDriverPingKey(driverId, orderId, currentStop.cellId),
    );

    if (!totalPings.success) {
      this.logger.error({
        message: `Failed to increment driver ping count for driverId:${driverId}, orderId:${orderId}, cellId:${currentStop.cellId}`,
        error: totalPings.error,
      });

      throw new InternalServerErrorException();
    }

    if (totalPings.data === 1) {
      const expired = await this.redisService.expire(
        makeDriverPingKey(driverId, orderId, currentStop.cellId),
        cacheTTlSecs,
      );

      if (!expired.success) {
        this.logger.error({
          message: `Failed to set ttl for driver ping count for driverId:${driverId}, orderId:${orderId}, cellId:${currentStop.cellId}`,
          error: expired.error,
        });
      }
    }

    if (totalPings.data < totalPingsRequired.data) {
      this.logger.debug(
        `Driver ${driverId} has pinged ${totalPings.data} times for order ${orderId}, cellId: ${currentStop.cellId}`,
      );

      return { message: 'success' };
    }

    await this.databaseService.$transaction(async (tx) => {
      await tx.stop.update({
        where: { id: currentStop.id },
        data: { status: 'ARRIVED', arrivedAt: new Date() },
      });

      const nextStop = await tx.stop.findFirst({
        where: { orderId, sequence: currentStop.sequence + 1 },
        select: { id: true, cellId: true, sequence: true },
      });

      if (nextStop) {
        const cachedNextStop = await this.cacheStop(orderId, nextStop);

        if (!cachedNextStop.success) {
          this.logger.error({
            message: `Failed to cache next stop for orderId:${orderId}`,
            error: cachedNextStop.error,
          });
        }
      } else {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' },
        });

        await tx.driver.update({
          where: { id: driverId },
          data: {
            isAvailable: true,
          },
        });

        const deleteResult = await this.redisService.delete(
          makeOrderStopKey(orderId),
        );

        if (!deleteResult.success) {
          this.logger.error({
            message: `Failed to delete order stop key for orderId:${orderId}`,
            error: deleteResult.error,
          });
        }
      }

      const deletedPings = await this.redisService.delete(
        makeDriverPingKey(driverId, orderId, currentStop.cellId),
      );

      if (!deletedPings.success) {
        this.logger.error({
          message: `Failed to delete driver ping key for driverId:${driverId}, orderId:${orderId}, cellId:${currentStop.cellId}`,
          error: deletedPings.error,
        });
      }
    });

    return { message: 'success' };
  }

  async getAvailableOrders(cursor?: string) {
    const orders = await this.databaseService.order.findMany({
      where: {
        status: 'PENDING',
      },
      cursor: cursor ? { id: cursor } : undefined,
      take: this.limit + 1,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = orders.length > this.limit;
    const nextCursor = hasMore ? orders[this.limit].id : null;
    const actualOrders = orders.slice(0, this.limit);

    return { orders: actualOrders, hasMore, nextCursor };
  }

  async getCustomersOrders(
    customerId: string,
    cursor?: string,
    status?: OrderStatus,
  ) {
    const orders = await this.databaseService.order.findMany({
      where: {
        status,
        customerId,
      },
      cursor: cursor ? { id: cursor } : undefined,
      take: this.limit + 1,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = orders.length > this.limit;
    const nextCursor = hasMore ? orders[this.limit].id : null;
    const actualOrders = orders.slice(0, this.limit);

    return { orders: actualOrders, hasMore, nextCursor };
  }

  async getDriverDeliveries(
    driverId: string,
    cursor?: string,
    status?: OrderStatus,
  ) {
    const orders = await this.databaseService.order.findMany({
      where: {
        status,
        driverId,
      },
      cursor: cursor ? { id: cursor } : undefined,
      take: this.limit + 1,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = orders.length > this.limit;
    const nextCursor = hasMore ? orders[this.limit].id : null;
    const actualOrders = orders.slice(0, this.limit);

    return { orders: actualOrders, hasMore, nextCursor };
  }
}
