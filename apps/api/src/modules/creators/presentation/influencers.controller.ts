import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorsService } from '../application/creators.service';
import { UpdateInfluencerDto } from '../application/dtos/update-influencer.dto';
import { DeleteAccountDto } from '../application/dtos/delete-account.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { AUTH_THROTTLE } from '../../../shared/throttle/auth-throttle';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('influencers')
@Controller('influencers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InfluencersController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({ summary: 'Perfil do creator autenticado (Influencer)' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.creatorsService.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({
    summary: 'Atualizar perfil do creator (inclui toggle público LGPD)',
  })
  updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInfluencerDto,
  ) {
    return this.creatorsService.updateMe(user.id, dto);
  }

  @Get('me/export')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({
    summary: 'Exportar os dados do creator autenticado (LGPD art. 18 II/V)',
  })
  exportMyData(@CurrentUser() user: { id: string }) {
    return this.creatorsService.exportMyData(user.id);
  }

  @Delete('me')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @Throttle({ default: AUTH_THROTTLE })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Apagar a conta do creator (irreversível, exige a senha atual, LGPD art. 18 VI)',
  })
  async deleteMe(
    @CurrentUser() user: { id: string },
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.creatorsService.deleteMyAccount(user.id, dto);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
