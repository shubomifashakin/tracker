import { SetMetadata } from '@nestjs/common';

export const IS_IDEMPOTENT_KEY = 'isIdempotent';

export type IdempotencyOptions = {
  expiresInSeconds?: number;
  required: boolean;
};

export function IsIdempotent(
  options: IdempotencyOptions = { required: true, expiresInSeconds: 86400 },
) {
  return SetMetadata(IS_IDEMPOTENT_KEY, options);
}
