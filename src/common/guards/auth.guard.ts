import type { Request } from 'express';

import { JwtService } from '@nestjs/jwt';

import {
  Logger,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TOKEN } from '../constants';

@Injectable()
export class AuthGuard implements CanActivate {
  private logger = new Logger(AuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const hostType = ctx.getType();

    if (hostType === 'http') {
      const request = ctx.switchToHttp().getRequest<Request>();
      const accessToken = request.cookies?.[TOKEN.ACCESS.TYPE] as string | null;

      if (!accessToken) {
        this.logger.debug({
          message: 'Unauthorized: No access token found',
        });

        throw new UnauthorizedException('Unauthorized');
      }

      try {
        const claims = await this.jwtService.verifyAsync<{
          jti: string;
          userId: string;
        }>(accessToken);

        const userId = claims.userId;

        request.user = { id: userId };

        return true;
      } catch (error: unknown) {
        this.logger.debug({
          message: 'Unauthorized: Invalid token',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new UnauthorizedException('Unauthorized');
      }
    }

    return false;
  }
}
