import { createHash } from 'crypto';
import type { Request, Response } from 'express';

import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { catchError, from, Observable, of, switchMap, throwError } from 'rxjs';

import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RedisService } from '../../../core';
import { IdempotencyOptions, IS_IDEMPOTENT_KEY } from '../../decorators';

@Injectable()
export class OrderIdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OrderIdempotencyInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const ctxType = ctx.getType();

    if (ctxType === 'http') {
      const req = ctx.switchToHttp().getRequest<Request>();
      const response = ctx.switchToHttp().getResponse<Response>();

      const idempotencyOptions =
        this.reflector.getAllAndOverride<IdempotencyOptions>(
          IS_IDEMPOTENT_KEY,
          [ctx.getHandler(), ctx.getClass()],
        );

      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      if (!idempotencyOptions?.required) {
        return next.handle();
      }

      if (!idempotencyKey) {
        this.logger.warn({
          message: 'Idempotency key is required',
        });

        throw new BadRequestException('Idempotency key is required');
      }

      const userId = req.user?.id || 'unknown';
      const keyHash = createHash('sha256')
        .update(`${idempotencyKey}:${userId}`)
        .digest('hex');

      const redisKey = `idempotency:${keyHash}`;

      const cached = await this.redisService.get<{
        status: number;
        body: unknown;
      }>(redisKey);

      if (cached.success && cached.data) {
        response.status(cached.data.status);
        return of(cached.data.body);
      }

      return next.handle().pipe(
        switchMap((data: unknown) =>
          from(
            this.redisService.set(
              redisKey,
              { status: response.statusCode, body: data },
              {
                EX: idempotencyOptions?.expiresInSeconds ?? 86400,
                NX: true,
              },
            ),
          ).pipe(switchMap(() => of(data))),
        ),
        catchError((error: Error) => throwError(() => error)),
      );
    }

    return next.handle();
  }
}
