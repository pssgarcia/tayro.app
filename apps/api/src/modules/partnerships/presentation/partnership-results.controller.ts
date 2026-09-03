import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartnershipResultsService } from '../application/partnership-results.service';
import { CreatePartnershipResultDto } from '../application/dtos/create-partnership-result.dto';
import { UpdatePartnershipResultDto } from '../application/dtos/update-partnership-result.dto';
import { SetResultVisibilityDto } from '../application/dtos/set-result-visibility.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('partnership-results')
@Controller('partnership-results')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PartnershipResultsController {
  constructor(private readonly service: PartnershipResultsService) {}

  // Literais antes de `:id` (convenção do projeto) — `mine` nunca deve ser
  // interpretado como id de resultado.

  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({
    summary: 'Resultados que a creator recebeu das marcas (Influencer)',
  })
  findMine(@CurrentUser() user: { id: string }) {
    return this.service.findMine(user.id);
  }

  @Get('campaign/:campaignId')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({
    summary: 'Parcerias aprovadas de uma campanha e seus resultados (Brand)',
  })
  findByCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.findByCampaign(campaignId, user.id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Registrar resultado de uma parceria (Brand)' })
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePartnershipResultDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/visibility')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({
    summary: 'Mostrar/esconder um resultado no próprio perfil (Influencer)',
  })
  setVisibility(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SetResultVisibilityDto,
  ) {
    return this.service.setVisibility(id, user.id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Corrigir resultado registrado (Brand)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePartnershipResultDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover resultado registrado (Brand)' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.service.remove(id, user.id);
  }
}
