import type { Request } from 'express';
import {
  Req,
  Get,
  Post,
  Query,
  Body,
  Logger,
  UseGuards,
  Controller,
  ParseIntPipe,
  ParseEnumPipe,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';

import { CustomersService } from './customers.service';

import { CreateOrderDto } from '../orders';

import { OrderStatus } from '../../../generated/prisma/enums';
import {
  Role,
  AuthGuard,
  RolesGuard,
  UserRoles,
  IsIdempotent,
  OrderIdempotencyInterceptor,
} from '../../common';

@Controller('customers')
@UseGuards(AuthGuard, RolesGuard)
@Role(UserRoles.CUSTOMER)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  private requireCustomerId(req: Request): string {
    if (!req.user.customerId) {
      this.logger.warn({
        message: 'Customer ID not found in user object',
        userId: req.user.id,
      });

      throw new ForbiddenException();
    }

    return req.user.customerId;
  }

  @Post('orders')
  @UseInterceptors(OrderIdempotencyInterceptor)
  @IsIdempotent({ required: true })
  createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const customerId = this.requireCustomerId(req);
    return this.customersService.createOrder(customerId, dto);
  }

  @Get('orders')
  getOrders(
    @Req() req: Request,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const customerId = this.requireCustomerId(req);
    return this.customersService.getOrders(customerId, status, cursor, limit);
  }
}
