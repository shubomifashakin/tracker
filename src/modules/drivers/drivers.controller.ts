import type { Request } from 'express';
import {
  Req,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Controller,
  ParseEnumPipe,
  ParseIntPipe,
} from '@nestjs/common';

import { DriversService } from './drivers.service';

import { AssignDriverDto, DriverPingDto } from '../orders';
import { AuthGuard } from '../../common';
import { RegisterVehicleDto } from '../vehicles/common/dtos/register-vehicle.dto';
import { OrderStatus } from '../../../generated/prisma/enums';

@UseGuards(AuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('vehicles')
  registerVehicle(@Body() dto: RegisterVehicleDto, @Req() req: Request) {
    return this.driversService.registerVehicle(req.user.id, dto);
  }

  @Get('vehicles')
  getVehicles(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.driversService.getVehicles(req.user.id, cursor, limit);
  }

  @Post('orders/:orderId/assign')
  assign(
    @Req() req: Request,
    @Body() dto: AssignDriverDto,
    @Param('orderId') orderId: string,
  ) {
    return this.driversService.assignToOrder(orderId, req.user.id, dto);
  }

  @Get('orders')
  getOrders(
    @Req() req: Request,
    @Query('cursor') cursor?: string,
    @Query('limit', ParseIntPipe) limit?: number,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
  ) {
    return this.driversService.getOrderHistory(
      req.user.id,
      cursor,
      limit,
      status,
    );
  }

  @Post('orders/:orderId/ping')
  ping(
    @Req() req: Request,
    @Body() dto: DriverPingDto,
    @Param('orderId') orderId: string,
  ) {
    return this.driversService.ping(req.user.id, orderId, dto);
  }
}
