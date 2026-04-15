import { Module } from '@nestjs/common';

import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

import { OrdersModule } from '../orders';

import { DatabaseModule, RedisModule } from '../../core';

@Module({
  providers: [CustomersService],
  controllers: [CustomersController],
  imports: [OrdersModule, DatabaseModule, RedisModule],
})
export class CustomersModule {}
