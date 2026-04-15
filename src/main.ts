import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  ShutdownSignal,
  ValidationPipe,
  VersioningType,
  BadRequestException,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import {
  PrismaClientKnownRequestFilterFilter,
  PrismaClientUnknownRequestFilterFilter,
} from './common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.enableCors({
    origin: configService.getOrThrow('FRONTEND_URL'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });
  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });

  app.set('trust proxy', true);
  app.enableShutdownHooks([ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT]);

  app.useGlobalFilters(
    new PrismaClientKnownRequestFilterFilter(),
    new PrismaClientUnknownRequestFilterFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const firstError = errors[0];

        let message = 'Invalid Payload';

        if (firstError?.constraints) {
          message = Object.values(firstError.constraints)[0];
        }

        return new BadRequestException(message);
      },
    }),
  );

  await app.listen(configService.getOrThrow('PORT'));
}

void bootstrap();
