import { Module } from '@nestjs/common';

import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

import { OrdersModule } from '../orders';
import { DatabaseModule, RedisModule } from '../../core';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  controllers: [DriversController],
  providers: [DriversService],
  imports: [OrdersModule, DatabaseModule, VehiclesModule, RedisModule],
})
export class DriversModule {}
