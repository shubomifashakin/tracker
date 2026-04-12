import { type Response, type Request } from 'express';
import {
  Body,
  Controller,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './common/dtos';

import { AppConfigService } from '../../core';
import { MESSAGES, TOKEN } from '../../common/constants';

@Controller('auth')
export class AuthController {
  logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  private getDomain() {
    const domain = this.configService.BASE_URL;

    if (!domain.success || !domain.data) {
      this.logger.error({
        message: 'Domain name not configured',
        error: domain.error,
      });

      throw new InternalServerErrorException();
    }

    return domain.data;
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const domain = this.getDomain();

    const tokens = await this.authService.login(dto);
    res.cookie(TOKEN.ACCESS.TYPE, tokens.accessToken.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: TOKEN.ACCESS.EXPIRATION_MS,
      domain: domain,
    });

    res.cookie(TOKEN.REFRESH.TYPE, tokens.refreshToken.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: TOKEN.REFRESH.EXPIRATION_MS,
      domain: domain,
    });

    return { message: 'success' };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const domain = this.getDomain();

    const refreshToken = req.cookies[TOKEN.REFRESH.TYPE] as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
    }

    const tokens = await this.authService.refresh(refreshToken);

    res.cookie(TOKEN.ACCESS.TYPE, tokens.accessToken.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: TOKEN.ACCESS.EXPIRATION_MS,
      domain: domain,
    });

    res.cookie(TOKEN.REFRESH.TYPE, tokens.refreshToken.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: TOKEN.REFRESH.EXPIRATION_MS,
      domain: domain,
    });

    return { message: 'success' };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const domain = this.getDomain();

    const refreshToken = req.cookies[TOKEN.REFRESH.TYPE] as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie(TOKEN.ACCESS.TYPE, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      domain,
    });

    res.clearCookie(TOKEN.REFRESH.TYPE, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      domain,
    });

    return { message: 'success' };
  }
}
