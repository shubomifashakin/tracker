import type { Request } from 'express';
import {
  Req,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Controller,
  ParseIntPipe,
  ParseEnumPipe,
  UseInterceptors,
} from '@nestjs/common';

import { CustomersService } from './customers.service';

import { CreateOrderDto } from '../orders';

import { AuthGuard } from '../../common/guards/auth/auth.guard';

import { OrderStatus } from '../../../generated/prisma/enums';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post('orders')
  //FIXME: Add idempotency interceptor
  @UseInterceptors()
  createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    return this.customersService.createOrder(req.user.id, dto);
  }

  @Get('orders')
  getOrders(
    @Req() req: Request,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @Query('cursor') cursor?: string,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    return this.customersService.getOrders(req.user.id, status, cursor, limit);
  }
}
