import { Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { DatabaseModule, HasherModule } from '../../core';

@Module({
  providers: [AuthService],
  controllers: [AuthController],
  imports: [DatabaseModule, HasherModule],
})
export class AuthModule {}
