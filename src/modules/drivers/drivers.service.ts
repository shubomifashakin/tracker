import { Injectable, Logger } from '@nestjs/common';

import { AssignDriverDto, DriverPingDto, OrdersService } from '../orders';

import { DatabaseService, RedisService } from '../../core';
import { RegisterVehicleDto, VehiclesService } from '../vehicles';

import { OrderStatus } from '../../../generated/prisma/enums';
import { makeDriverDetailsCacheKey } from '../../common';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly orderService: OrdersService,
    private readonly databaseService: DatabaseService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async getVehicles(driverId: string, cursor?: string, limit?: number) {
    return this.vehiclesService.getVehicles(driverId, cursor, limit);
  }

  async registerVehicle(driverId: string, dto: RegisterVehicleDto) {
    return this.vehiclesService.registerVehicle(driverId, dto);
  }

  async assignToOrder(
    orderId: string,
    driverId: string,
    userId: string,
    dto: AssignDriverDto,
  ) {
    const cacheKey = makeDriverDetailsCacheKey(userId);

    const assigned = await this.orderService.assignDriver(
      orderId,
      driverId,
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

  async ping(driverId: string, orderId: string, dto: DriverPingDto) {
    return this.orderService.driverPing(driverId, orderId, dto);
  }

  async getOrderHistory(
    driverId: string,
    cursor?: string,
    limit?: number,
    status?: OrderStatus,
  ) {
    const available = await this.orderService.getDriverDeliveries(
      driverId,
      cursor,
      status,
      limit,
    );

    return available;
  }
}
