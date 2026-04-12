import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { makeError } from '../../common/fns';
import { FnResult } from '../../types/common.types';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get REDIS_URL(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('REDIS_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get PING_INTERVAL(): FnResult<number> {
    try {
      const interval = this.configService.getOrThrow<number>('PING_INTERVAL');

      return { success: true, data: interval, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get DATABASE_URL(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('DATABASE_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get PORT(): FnResult<number> {
    try {
      const port = this.configService.getOrThrow<number>('PORT');

      return { success: true, data: port, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get SERVICE_NAME(): FnResult<string> {
    try {
      const name = this.configService.getOrThrow<string>('SERVICE_NAME');

      return { success: true, data: name, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get JWT_PRIVATE_KEY(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('JWT_PRIVATE_KEY');

      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get JWT_PUBLIC_KEY(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('JWT_PUBLIC_KEY');

      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get BASE_URL(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('BASE_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get FRONTEND_URL(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('FRONTEND_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }
}
