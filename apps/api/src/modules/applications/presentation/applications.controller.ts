import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApplicationsService } from '../application/applications.service';
import { CreateApplicationDto } from '../application/dtos/create-application.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({ summary: 'Influencer aplica para uma campanha' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(user.id, dto);
  }

  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({ summary: 'Minhas candidaturas (Influencer)' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.applicationsService.findMine(user.id);
  }

  @Get('campaign/:campaignId')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Candidaturas de uma campanha (Brand)' })
  findByCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.applicationsService.findByCampaign(campaignId, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Aprovar candidatura (Brand)' })
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applicationsService.approve(id, user.id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Rejeitar candidatura (Brand)' })
  reject(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applicationsService.reject(id, user.id);
  }

  @Patch(':id/withdraw')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirar candidatura (Influencer)' })
  withdraw(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applicationsService.withdraw(id, user.id);
  }

  @Patch(':id/refresh-ig')
  @UseGuards(RolesGuard, ThrottlerGuard)
  @Roles('BRAND')
  @Throttle({ default: { limit: 3, ttl: 300_000 } }) // 3 chamadas por 5 min por IP
  @ApiOperation({ summary: 'Atualizar dados de IG da creator — sujeito a cooldown (Brand)' })
  refreshIg(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.applicationsService.refreshInfluencerIg(id, user.id);
  }
}
