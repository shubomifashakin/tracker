import {
  Get,
  Query,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';

import { OrdersService } from './orders.service';

import { AuthGuard, Role, UserRoles, RolesGuard } from '../../common';

@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Role(UserRoles.DRIVER)
  getAvailableOrders(
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ordersService.getAvailableOrders(cursor, limit);
  }
}
