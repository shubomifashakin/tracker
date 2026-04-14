import { Injectable } from '@nestjs/common';

import { RedisService, DatabaseService } from '../../core';

import { RegisterVehicleDto } from './common/dtos/register-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly limit = 10;

  constructor(
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
  ) {}

  async registerVehicle(driverId: string, dto: RegisterVehicleDto) {
    const vehicle = await this.databaseService.vehicle.create({
      data: {
        driverId,
        ...dto,
      },
    });

    return { vehicleId: vehicle.id };
  }

  async getVehicles(
    driverId: string,
    cursor?: string,
    limit: number = this.limit,
  ) {
    const vehicles = await this.databaseService.vehicle.findMany({
      where: {
        driverId,
      },
      cursor: cursor ? { id: cursor } : undefined,
      take: limit + 1,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = vehicles.length > limit;
    const nextCursor = hasMore ? vehicles[limit].id : null;
    const actualVehicles = vehicles.slice(0, limit);

    return { vehicles: actualVehicles, hasMore, nextCursor };
  }
}
