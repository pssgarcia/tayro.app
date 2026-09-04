import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { AUTH_THROTTLE } from '../../../shared/throttle/auth-throttle';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../application/auth.service';
import { CreatorsService } from '../../creators/application/creators.service';
import { RegisterBrandDto } from '../application/dtos/register-brand.dto';
import { RegisterInfluencerDto } from '../application/dtos/register-influencer.dto';
import { LoginDto } from '../application/dtos/login.dto';
import { ClaimAccountDto } from '../application/dtos/claim-account.dto';
import { ForgotPasswordDto } from '../application/dtos/forgot-password.dto';
import { ResetPasswordDto } from '../application/dtos/reset-password.dto';
import { ChangePasswordDto } from '../application/dtos/change-password.dto';
import { ChangeEmailDto } from '../application/dtos/change-email.dto';
import { DeleteAccountDto } from '../../creators/application/dtos/delete-account.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly creatorsService: CreatorsService,
    private readonly config: ConfigService,
  ) {}

  @Post('register/brand')
  @Throttle({ default: AUTH_THROTTLE })
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
  @Throttle({ default: AUTH_THROTTLE })
  @ApiOperation({ summary: 'Cadastrar conta de influencer' })
  async registerInfluencer(
    @Body() dto: RegisterInfluencerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerInfluencer(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('claim')
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Definir senha de conta CLAIMABLE (auto-login)' })
  async claim(
    @Body() dto: ClaimAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.claimAccount(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Get('claim/:token')
  @Throttle({ default: AUTH_THROTTLE })
  @ApiOperation({
    summary: 'Preview de identidade do token de claim (não consome o token)',
  })
  async claimPreview(@Param('token') token: string) {
    return this.authService.getClaimPreview(token);
  }

  @Post('forgot-password')
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar link de recuperação de senha' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      message: 'Se este e-mail existir, enviaremos um link de recuperação.',
    };
  }

  @Post('reset-password')
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Definir nova senha via token de recuperação (auto-login)',
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.resetPassword(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trocar senha logada (exige a senha atual, auto-login)',
  })
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('change-email')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trocar e-mail logado (exige a senha atual, auto-login)',
  })
  async changeEmail(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangeEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changeEmail(user.id, dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  // Vive em /auth/* (não /influencers/*) de propósito: o interceptor de 401
  // do frontend trata qualquer 401 fora de /auth/* como sessão expirada e
  // desloga — aqui o 401 é "senha atual incorreta", não token expirado
  // (mesmo motivo de changePassword/changeEmail). Ver specs/account-deletion.
  @Post('delete-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('INFLUENCER')
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Apagar a conta do creator (irreversível, exige a senha atual, LGPD art. 18 VI)',
  })
  async deleteAccount(
    @CurrentUser() user: { id: string },
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.creatorsService.deleteMyAccount(user.id, dto);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Post('login')
  @Throttle({ default: AUTH_THROTTLE })
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
  @ApiOperation({ summary: 'Logout: invalida refresh token e apaga cookie' })
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
