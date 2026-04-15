import type { Request } from 'express';

import { Reflector } from '@nestjs/core';
import {
  Logger,
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { UserRoles } from '../constants';
import { RolesKey } from '../decorators';
import { DatabaseService, RedisService } from '../../core';
import { makeCustomerDetailsCacheKey, makeDriverDetailsCacheKey } from '../fns';

export type CachedDriverDetails = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isAvailable: boolean;
  userId: string;
};

export type CachedCustomerDetails = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoles>(
      RolesKey,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<Request>();

    if (requiredRoles === UserRoles.DRIVER) {
      const cacheKey = makeDriverDetailsCacheKey(user.id);

      const isDriverCache =
        await this.redisService.get<CachedDriverDetails>(cacheKey);

      if (!isDriverCache.success) {
        this.logger.error({
          message: 'Failed to get driver details from cache',
          error: isDriverCache.error,
        });
      }

      if (!isDriverCache.data) {
        this.logger.debug({
          message: 'Driver cache miss',
        });
      }

      if (isDriverCache.data) {
        user.driverId = isDriverCache.data.id;
        return true;
      }

      const isDriver = (await this.databaseService.driver.findFirst({
        where: {
          userId: user.id,
        },
      })) satisfies CachedDriverDetails | null;

      if (!isDriver) return false;

      const storeInCache = await this.redisService.set(cacheKey, isDriver, {
        expiration: { type: 'EX', value: 3600 },
      });

      if (!storeInCache.success) {
        this.logger.error({
          message: 'Failed to cache driver details',
          error: storeInCache.error,
        });
      }

      user.driverId = isDriver.id;

      return true;
    }

    if (requiredRoles === UserRoles.CUSTOMER) {
      const cacheKey = makeCustomerDetailsCacheKey(user.id);

      const isCustomerCache =
        await this.redisService.get<CachedCustomerDetails>(cacheKey);

      if (!isCustomerCache.success) {
        this.logger.error({
          message: 'Failed to get customer details from cache',
          error: isCustomerCache.error,
        });
      }

      if (!isCustomerCache.data) {
        this.logger.debug({
          message: 'Customer cache miss',
        });
      }

      if (isCustomerCache.data) {
        user.customerId = isCustomerCache.data.id;
        return true;
      }

      const isCustomer = (await this.databaseService.customer.findFirst({
        where: {
          userId: user.id,
        },
      })) satisfies CachedCustomerDetails | null;

      if (!isCustomer) return false;

      const storeInCache = await this.redisService.set(cacheKey, isCustomer, {
        expiration: { type: 'EX', value: 3600 },
      });

      if (!storeInCache.success) {
        this.logger.error({
          message: 'Failed to cache customer details',
          error: storeInCache.error,
        });
      }

      user.customerId = isCustomer.id;

      return true;
    }

    return false;
  }
}
