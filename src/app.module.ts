import { Request } from 'express';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import {
  H3Module,
  RedisModule,
  RedisService,
  HasherModule,
  DatabaseModule,
  AppConfigModule,
  AppConfigService,
} from './core';

import { validate } from './common/fns';
import { AuthModule } from './modules/auth';
import { OrdersModule } from './modules/orders';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: false,
      validate,
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        return {
          secret: configService.JWT_PRIVATE_KEY.data!,
          signOptions: { expiresIn: '10m', algorithm: 'RS256' },
          verifyOptions: { algorithms: ['RS256'] },
          privateKey: configService.JWT_PRIVATE_KEY.data!,
          publicKey: configService.JWT_PUBLIC_KEY.data!,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (cache: RedisService) => {
        return {
          throttlers: [
            {
              ttl: 15,
              limit: 30,
              name: 'default',
              blockDuration: 60,
            },
          ],
          errorMessage: 'Too many requests',
          generateKey: (ctx, _, throttlerName) => {
            const req = ctx.switchToHttp().getRequest<Request>();

            const key = req.user.id || req?.ip || req?.ips?.[0] || 'unknown-ip';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const route = req.route?.path || req.path;

            return `${throttlerName}:${route}:${key}`.toLowerCase();
          },

          storage: {
            async increment(key, ttl, limit, blockDuration) {
              return await cache.ratelimit(key, ttl, limit, blockDuration);
            },
          },
        };
      },
    }),
    H3Module,
    RedisModule,
    AppConfigModule,
    DatabaseModule,
    HasherModule,
    AuthModule,
    OrdersModule,
    CustomersModule,
  ],
  providers: [],
})
export class AppModule {}
