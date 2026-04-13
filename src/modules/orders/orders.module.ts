import { Module } from '@nestjs/common';

import { OrdersService } from './orders.service';

import { DatabaseModule, H3Module, RedisModule } from '../../core';

@Module({
  providers: [OrdersService],
  imports: [DatabaseModule, RedisModule, H3Module],
})
export class OrdersModule {}
