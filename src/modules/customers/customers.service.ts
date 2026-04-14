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

  async createOrder(userId: string, dto: CreateOrderDto) {
    const customerId = await this.databaseService.customer.findUniqueOrThrow({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    const ordered = await this.orderService.createOrder(customerId.id, dto);

    return ordered;
  }

  async getOrders(
    userId: string,
    status?: OrderStatus,
    cursor?: string,
    limit?: number,
  ) {
    const customerId = await this.databaseService.customer.findUniqueOrThrow({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    return this.orderService.getCustomersOrders(
      customerId.id,
      cursor,
      status,
      limit,
    );
  }
}
