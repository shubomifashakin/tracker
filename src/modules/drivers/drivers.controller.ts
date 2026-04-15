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
  Logger,
  ForbiddenException,
} from '@nestjs/common';

import { DriversService } from './drivers.service';
import { RegisterVehicleDto } from '../vehicles';

import { AssignDriverDto, DriverPingDto } from '../orders';
import { AuthGuard, Role, RolesGuard, UserRoles } from '../../common';
import { OrderStatus } from '../../../generated/prisma/enums';

@UseGuards(AuthGuard, RolesGuard)
@Role(UserRoles.DRIVER)
@Controller('drivers')
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly driversService: DriversService) {}

  private requireDriverId(req: Request): string {
    if (!req.user.driverId) {
      this.logger.warn({
        message: 'Driver ID not found in user object',
        userId: req.user.id,
      });

      throw new ForbiddenException();
    }

    return req.user.driverId;
  }

  @Post('vehicles')
  registerVehicle(@Body() dto: RegisterVehicleDto, @Req() req: Request) {
    const driverId = this.requireDriverId(req);

    return this.driversService.registerVehicle(driverId, dto);
  }

  @Get('vehicles')
  getVehicles(
    @Req() req: Request,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    const driverId = this.requireDriverId(req);

    return this.driversService.getVehicles(driverId, cursor, limit);
  }

  @Post('orders/:orderId/assign')
  assign(
    @Req() req: Request,
    @Body() dto: AssignDriverDto,
    @Param('orderId') orderId: string,
  ) {
    const driverId = this.requireDriverId(req);

    return this.driversService.assignToOrder(
      orderId,
      driverId,
      req.user.id,
      dto,
    );
  }

  @Get('orders')
  getOrders(
    @Req() req: Request,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
  ) {
    const driverId = this.requireDriverId(req);

    return this.driversService.getOrderHistory(driverId, cursor, limit, status);
  }

  @Post('orders/:orderId/ping')
  ping(
    @Req() req: Request,
    @Body() dto: DriverPingDto,
    @Param('orderId') orderId: string,
  ) {
    const driverId = this.requireDriverId(req);

    return this.driversService.ping(driverId, orderId, dto);
  }
}
