import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from '../application/campaigns.service';
import { CreateCampaignDto } from '../application/dtos/create-campaign.dto';
import { UpdateCampaignDto } from '../application/dtos/update-campaign.dto';
import { ListCampaignsDto } from '../application/dtos/list-campaigns.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar campanha (Brand)' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.id, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Listar campanhas ativas (público)' })
  findAll(
    @Query() query: ListCampaignsDto,
    @CurrentUser() user?: { id: string },
  ) {
    return this.campaignsService.findAll(query, user?.id);
  }

  // Precisa vir antes de :id para não ser interpretado como um UUID
  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar minhas campanhas (Brand)' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.campaignsService.findMine(user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Detalhes de uma campanha (ACTIVE pública; outros status só para dono)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.campaignsService.findOne(id, user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar campanha — somente DRAFT (Brand)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, user.id, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar campanha DRAFT → ACTIVE (Brand)' })
  publish(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.publish(id, user.id);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fechar campanha ACTIVE → CLOSED (Brand)' })
  close(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.close(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BRAND')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar campanha DRAFT (Brand)' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.remove(id, user.id);
  }
}
