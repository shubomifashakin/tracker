import { plainToInstance, Transform } from 'class-transformer';
import {
  Max,
  Min,
  IsUrl,
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsNotEmpty,
} from 'class-validator';

enum Environment {
  Test = 'test',
  Production = 'production',
  Development = 'development',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsString()
  @IsNotEmpty()
  SERVICE_NAME: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  BASE_URL: string;

  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.replace(/\\n/g, '\n'))
  JWT_PRIVATE_KEY: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.replace(/\\n/g, '\n'))
  JWT_PUBLIC_KEY: string;

  @IsNumber()
  @Min(1)
  @Transform(({ value }: { value: string }) => {
    const parsed = parseInt(value);
    if (isNaN(parsed)) throw new Error('Must be a valid number');
    return parsed;
  })
  TOTAL_PINGS_REQUIRED: number;

  @IsNumber()
  @Min(1)
  @Transform(({ value }: { value: string }) => {
    const parsed = parseInt(value);
    if (isNaN(parsed)) throw new Error('Must be a valid number');
    return parsed;
  })
  PING_INTERVAL_MS: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

export function makeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const err = new Error(String(error.message));
    if ('name' in error && error.name) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      err.name = String(error.name);
    }
    if ('stack' in error && error.stack) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      err.stack = String(error.stack);
    }
    return err;
  }

  return new Error(String(error));
}
