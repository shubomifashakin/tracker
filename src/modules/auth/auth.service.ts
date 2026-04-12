import {
  Logger,
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { v4 as uuid } from 'uuid';

import { LoginDto, RegisterDto } from './common/dtos';

import { DatabaseService, HasherService } from '../../core';
import {
  TOKEN,
  MESSAGES,
  UserRoles,
  DEFAULT_JWT_ALG,
} from '../../common/constants';

import { makeError } from '../../common/fns';
import { FnResult } from '../../types/common.types';

@Injectable()
export class AuthService {
  logger = new Logger(AuthService.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly hasherService: HasherService,
    private readonly databaseService: DatabaseService,
  ) {}

  private async generateToken(userInfo: { id: string }): Promise<
    FnResult<{
      accessToken: { token: string; id: string };
      refreshToken: { token: string; id: string };
    }>
  > {
    try {
      const accessTokenId = uuid();

      const refreshTokenId = uuid();

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          {
            userId: userInfo.id,
          },

          {
            algorithm: DEFAULT_JWT_ALG,
            jwtid: accessTokenId,
            expiresIn: TOKEN.ACCESS.EXPIRATION,
          },
        ),

        this.jwtService.signAsync(
          {
            userId: userInfo.id,
          },
          {
            algorithm: DEFAULT_JWT_ALG,
            jwtid: refreshTokenId,
            expiresIn: TOKEN.REFRESH.EXPIRATION,
          },
        ),
      ]);

      return {
        success: true,
        data: {
          accessToken: { token: accessToken, id: accessTokenId },
          refreshToken: { token: refreshToken, id: refreshTokenId },
        },
        error: null,
      };
    } catch (error) {
      return { success: false, error: makeError(error), data: null };
    }
  }

  async register(dto: RegisterDto) {
    if (dto.role !== UserRoles.DRIVER && dto.role !== UserRoles.CUSTOMER) {
      throw new BadRequestException('Invalid role');
    }

    const hashedPassword = await this.hasherService.hash(dto.password);

    if (!hashedPassword.success) {
      this.logger.error({
        message: 'Failed to hash password',
        error: hashedPassword.error,
      });

      throw new InternalServerErrorException();
    }

    await this.databaseService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: hashedPassword.data,
          phone: dto.phone,
        },
      });

      if (dto.role === UserRoles.DRIVER) {
        await tx.driver.create({
          data: {
            userId: user.id,
          },
        });
      }

      if (dto.role === UserRoles.CUSTOMER) {
        await tx.customer.create({
          data: {
            userId: user.id,
          },
        });
      }
    });

    return { message: 'success' };
  }

  async login(dto: LoginDto) {
    const user = await this.databaseService.user.findUniqueOrThrow({
      where: {
        email: dto.email,
      },
      select: {
        password: true,
        id: true,
      },
    });

    if (dto.role === UserRoles.CUSTOMER) {
      await this.databaseService.customer.findUniqueOrThrow({
        where: {
          userId: user.id,
        },
      });
    }

    if (dto.role === UserRoles.DRIVER) {
      await this.databaseService.driver.findUniqueOrThrow({
        where: {
          userId: user.id,
        },
      });
    }

    const isPasswordValid = await this.hasherService.verify(
      dto.password,
      user.password,
    );

    if (!isPasswordValid.success) {
      throw new InternalServerErrorException();
    }

    if (!isPasswordValid.data) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateToken({ id: user.id });

    if (!tokens.success) {
      this.logger.error({
        message: 'Failed to generate tokens',
        error: tokens.error,
      });

      throw new InternalServerErrorException();
    }

    await this.databaseService.refreshToken.create({
      data: {
        token: tokens.data.refreshToken.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN.REFRESH.EXPIRATION_MS),
      },
    });

    return tokens.data;
  }

  async refresh(refreshToken: string) {
    const refreshTokenId = await this.jwtService.verifyAsync<{ jti: string }>(
      refreshToken,
    );

    if (!refreshTokenId?.jti) {
      throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
    }

    const refreshExists = await this.databaseService.refreshToken.findUnique({
      where: {
        token: refreshTokenId.jti,
      },
      select: {
        user: {
          select: {
            id: true,
          },
        },
        expiresAt: true,
      },
    });

    if (!refreshExists) {
      throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
    }

    const {
      data: tokens,
      error: tokensError,
      success: tokenSuccess,
    } = await this.generateToken({
      id: refreshExists.user.id,
    });

    if (!tokenSuccess) {
      this.logger.error({
        message: 'Failed to generate tokens',
        error: tokensError,
      });

      throw new InternalServerErrorException(MESSAGES.INTERNAL_SERVER_ERROR);
    }

    await this.databaseService.$transaction(async (tx) => {
      await tx.refreshToken.delete({
        where: { token: refreshTokenId.jti },
      });

      await tx.refreshToken.create({
        data: {
          token: tokens.refreshToken.id,
          userId: refreshExists.user.id,
          expiresAt: new Date(Date.now() + TOKEN.REFRESH.EXPIRATION_MS),
        },
      });
    });

    return tokens;
  }

  async logout(refreshToken: string) {
    const decoded = await this.jwtService
      .verifyAsync<{ jti: string }>(refreshToken)
      .catch(() => {
        this.logger.warn({
          message: 'Refresh token already expired',
        });

        return null;
      });

    if (!decoded) {
      return { message: 'success' };
    }

    await this.databaseService.refreshToken.delete({
      where: {
        token: decoded.jti,
      },
    });

    return { message: 'success' };
  }
}
