import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

import { createClient, RedisClientType, SetOptions } from 'redis';

import { makeError } from '../../common/fns';
import { FnResult } from '../../types/common.types';
import { AppConfigService } from '../app-config/app-config.service';

@Injectable()
export class RedisService implements OnModuleDestroy, OnModuleInit {
  private readonly client: RedisClientType;
  logger = new Logger(RedisService.name);

  constructor(private readonly configService: AppConfigService) {
    if (!configService.REDIS_URL.success) {
      throw new Error('Redis URL not found');
    }

    this.client = createClient({
      name: configService.SERVICE_NAME.data!,
      url: configService.REDIS_URL.data,
    });
  }

  async set(
    key: string,
    value: any,
    options?: SetOptions,
  ): Promise<FnResult<null>> {
    try {
      await this.client.set(key, JSON.stringify(value), options);

      return { success: true, data: null, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async get<T>(key: string): Promise<FnResult<T | null>> {
    try {
      const result = await this.client.get(key);

      return {
        success: true,
        data: result ? (JSON.parse(result) as T) : null,
        error: null,
      };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async increment(key: string): Promise<FnResult<number>> {
    try {
      const result = await this.client.incr(key);

      return { success: true, data: result, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async expire(key: string, ttl: number): Promise<FnResult<null>> {
    try {
      await this.client.expire(key, ttl);

      return { success: true, data: null, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async delete(key: string): Promise<FnResult<null>> {
    try {
      await this.client.del(key);

      return { success: true, data: null, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async ratelimit(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    try {
      const currentCount = await this.client.incr(key);

      if (currentCount === 1) {
        await this.client.expire(key, ttl);
      }
      const resetTime = Date.now() + ttl * 1000;
      const isBlocked = currentCount > limit;

      if (isBlocked && currentCount === limit + 1) {
        await this.client.expire(key, ttl + blockDuration);
      }

      const obj = {
        totalHits: currentCount,
        isBlocked: currentCount >= limit,
        timeToExpire: resetTime,
        timeToBlockExpire: resetTime + blockDuration * 1000,
      };

      return obj;
    } catch (error: unknown) {
      this.logger.error({
        message: 'Failed to increment rate limit',
        error,
      });

      return {
        totalHits: 0,
        isBlocked: false,
        timeToExpire: 0,
        timeToBlockExpire: 0,
      };
    }
  }

  async flushAll() {
    try {
      await this.client.flushAll();

      return { success: true, data: null, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  async onModuleInit() {
    await this.client.connect();

    this.client.on('error', (err: unknown) => {
      this.logger.error({
        message: 'Redis error',
        error: err,
      });
    });
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch {
      this.client.destroy();
    }
  }
}
