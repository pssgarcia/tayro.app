import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../application/auth.service';
import { RegisterBrandDto } from '../application/dtos/register-brand.dto';
import { RegisterInfluencerDto } from '../application/dtos/register-influencer.dto';
import { LoginDto } from '../application/dtos/login.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register/brand')
  @ApiOperation({ summary: 'Cadastrar conta de marca' })
  async registerBrand(
    @Body() dto: RegisterBrandDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerBrand(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('register/influencer')
  @ApiOperation({ summary: 'Cadastrar conta de influencer' })
  async registerInfluencer(
    @Body() dto: RegisterInfluencerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerInfluencer(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renovar access token via cookie' })
  async refresh(
    @CurrentUser() user: { id: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — invalida refresh token e apaga cookie' })
  async logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.revokeRefreshToken(user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: SEVEN_DAYS_MS,
      path: '/',
    });
  }
}
