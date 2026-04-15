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

  private async resolveRole<T extends { id: string }>(
    cacheKey: string,
    dbLookup: () => Promise<T | null>,
  ): Promise<T | null> {
    const cached = await this.redisService.get<T>(cacheKey);

    if (!cached.success) {
      this.logger.error({
        message: 'Failed to get role from cache',
        error: cached.error,
      });
    }

    if (cached.data) return cached.data;

    this.logger.debug({ message: 'Role cache miss' });

    const result = await dbLookup();

    if (!result) return null;

    const stored = await this.redisService.set(cacheKey, result, {
      expiration: { type: 'EX', value: 3600 },
    });

    if (!stored.success) {
      this.logger.error({
        message: 'Failed to cache role details',
        error: stored.error,
      });
    }

    return result;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoles>(
      RolesKey,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<Request>();

    if (requiredRoles === UserRoles.DRIVER) {
      const driver = await this.resolveRole(
        makeDriverDetailsCacheKey(user.id),
        () =>
          this.databaseService.driver.findFirst({ where: { userId: user.id } }),
      );

      if (!driver) return false;

      user.driverId = driver.id;

      return true;
    }

    if (requiredRoles === UserRoles.CUSTOMER) {
      const customer = await this.resolveRole(
        makeCustomerDetailsCacheKey(user.id),
        () =>
          this.databaseService.customer.findFirst({
            where: { userId: user.id },
          }),
      );

      if (!customer) return false;

      user.customerId = customer.id;

      return true;
    }

    return false;
  }
}
