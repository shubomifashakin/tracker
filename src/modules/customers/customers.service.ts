import { Injectable, Logger } from '@nestjs/common';

import { CreateOrderDto, OrdersService } from '../orders';

import { DatabaseService } from '../../core';
import { OrderStatus } from '../../../generated/prisma/enums';

@Injectable()
export class CustomersService {
  private logger = new Logger(CustomersService.name);

  constructor(
    private readonly orderService: OrdersService,
    private readonly databaseService: DatabaseService,
  ) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    const ordered = await this.orderService.createOrder(customerId, dto);

    return ordered;
  }

  async getOrders(
    customerId: string,
    status?: OrderStatus,
    cursor?: string,
    limit?: number,
  ) {
    return this.orderService.getCustomersOrders(
      customerId,
      cursor,
      status,
      limit,
    );
  }
}
