import { Module } from '@nestjs/common';

import { OrdersService } from './orders.service';

import { DatabaseModule, H3Module, RedisModule } from '../../core';
import { OrdersController } from './orders.controller';

@Module({
  exports: [OrdersService],
  providers: [OrdersService],
  imports: [DatabaseModule, RedisModule, H3Module],
  controllers: [OrdersController],
})
export class OrdersModule {}
