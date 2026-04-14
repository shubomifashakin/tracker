import { Module } from '@nestjs/common';

import { VehiclesService } from './vehicles.service';
import { DatabaseModule, RedisModule } from '../../core';

@Module({
  providers: [VehiclesService],
  exports: [VehiclesService],
  imports: [DatabaseModule, RedisModule],
})
export class VehiclesModule {}
