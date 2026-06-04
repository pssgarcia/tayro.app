import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RewardsService } from '../application/rewards.service';
import { CreateRewardDto } from '../application/dtos/create-reward.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('rewards')
@Controller('rewards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Registrar recompensa para influencer (Brand)' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRewardDto) {
    return this.rewardsService.create(user.id, dto);
  }

  @Get('campaign/:campaignId')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Recompensas de uma campanha (Brand)' })
  findByCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.rewardsService.findByCampaign(campaignId, user.id);
  }

  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({ summary: 'Minhas recompensas (Influencer)' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.rewardsService.findMine(user.id);
  }

  @Patch(':id/issue')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Marcar recompensa como emitida — PENDING → ISSUED (Brand)' })
  markAsIssued(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.rewardsService.markAsIssued(id, user.id);
  }

  @Patch(':id/deliver')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Marcar recompensa como entregue — ISSUED → DELIVERED (Brand)' })
  markAsDelivered(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.rewardsService.markAsDelivered(id, user.id);
  }
}
