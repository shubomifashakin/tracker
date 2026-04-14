import { Injectable, Logger } from '@nestjs/common';

import { AssignDriverDto, DriverPingDto, OrdersService } from '../orders';

import { DatabaseService, RedisService } from '../../core';
import { VehiclesService } from '../vehicles/vehicles.service';
import { RegisterVehicleDto } from '../vehicles/common/dtos/register-vehicle.dto';

import { OrderStatus } from '../../../generated/prisma/enums';

type CachedDriverDetails = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isAvailable: boolean;
  userId: string;
};

function makeDriverDetailsCacheKey(userId: string) {
  return `user:${userId}:driver`;
}

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly orderService: OrdersService,
    private readonly databaseService: DatabaseService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  private async getDriverDetails(userId: string) {
    const cacheKey = makeDriverDetailsCacheKey(userId);

    const cachedData =
      await this.redisService.get<CachedDriverDetails>(cacheKey);

    if (!cachedData.success) {
      this.logger.error({
        message: 'Failed to get driver details from cache',
        error: cachedData.error,
      });
    }

    if (cachedData.data) {
      return cachedData.data;
    }

    const driverId = (await this.databaseService.driver.findFirstOrThrow({
      where: {
        userId,
      },
    })) satisfies CachedDriverDetails;

    const storeInCache = await this.redisService.set(cacheKey, driverId, {
      expiration: { type: 'EX', value: 3600 },
    });

    if (!storeInCache.success) {
      this.logger.error({
        message: 'Failed to cache driver details',
        error: storeInCache.error,
      });
    }

    return driverId;
  }

  async getVehicles(userId: string, cursor?: string, limit?: number) {
    const driverId = await this.getDriverDetails(userId);

    return this.vehiclesService.getVehicles(driverId.id, cursor, limit);
  }

  async registerVehicle(userId: string, dto: RegisterVehicleDto) {
    const driverId = await this.getDriverDetails(userId);

    return this.vehiclesService.registerVehicle(driverId.id, dto);
  }

  async assignToOrder(orderId: string, userId: string, dto: AssignDriverDto) {
    const cacheKey = makeDriverDetailsCacheKey(userId);

    const driverId = await this.getDriverDetails(userId);

    const assigned = await this.orderService.assignDriver(
      orderId,
      driverId.id,
      dto,
    );

    const { success, error } = await this.redisService.delete(cacheKey);
    if (!success) {
      this.logger.error({
        message: 'Failed to delete cached driver details',
        error,
      });
    }

    return assigned;
  }

  async ping(userId: string, orderId: string, dto: DriverPingDto) {
    const driverId = await this.getDriverDetails(userId);

    return this.orderService.driverPing(driverId.id, orderId, dto);
  }

  async getOrderHistory(
    userId: string,
    cursor?: string,
    limit?: number,
    status?: OrderStatus,
  ) {
    const driverId = await this.getDriverDetails(userId);

    const available = await this.orderService.getDriverDeliveries(
      driverId.id,
      cursor,
      status,
      limit,
    );

    return available;
  }
}
