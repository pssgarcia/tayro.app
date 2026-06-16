import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CreatorsService } from '../application/creators.service';
import { PublicApplyDto } from '../application/dtos/public-apply.dto';

@ApiTags('programs')
@Controller('programs')
export class ProgramsPublicController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post(':id/apply/public')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Candidatura pública ao programa — sem login (Creator)',
  })
  applyPublic(@Param('id') campaignId: string, @Body() dto: PublicApplyDto) {
    return this.creatorsService.applyPublic(campaignId, dto);
  }
}
