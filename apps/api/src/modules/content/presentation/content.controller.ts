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
import { ContentService } from '../application/content.service';
import { CreateSubmissionDto } from '../application/dtos/create-submission.dto';
import { ReviewSubmissionDto } from '../application/dtos/review-submission.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('content')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({
    summary: 'Enviar conteúdo para uma application aprovada (Influencer)',
  })
  submit(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.contentService.submit(user.id, dto);
  }

  @Get('mine')
  @UseGuards(RolesGuard)
  @Roles('INFLUENCER')
  @ApiOperation({ summary: 'Meus conteúdos enviados (Influencer)' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.contentService.findMine(user.id);
  }

  @Get('campaign/:campaignId')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Todos os conteúdos de uma campanha (Brand)' })
  findByCampaign(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.findByCampaign(campaignId, user.id);
  }

  @Get('application/:applicationId')
  @ApiOperation({
    summary: 'Conteúdos de uma application (Brand ou Influencer dono)',
  })
  findByApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.findByApplication(applicationId, user.id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Aprovar conteúdo (Brand)' })
  approve(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.contentService.approve(id, user.id, dto);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Rejeitar conteúdo (Brand)' })
  reject(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.contentService.reject(id, user.id, dto);
  }

  @Patch(':id/request-revision')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Solicitar revisão do conteúdo (Brand)' })
  requestRevision(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.contentService.requestRevision(id, user.id, dto);
  }
}
