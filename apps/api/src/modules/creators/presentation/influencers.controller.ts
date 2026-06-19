import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreatorsService } from '../application/creators.service';
import { UpdateInfluencerDto } from '../application/dtos/update-influencer.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

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
}
