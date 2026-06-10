import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreatorsService } from '../application/creators.service';

@ApiTags('creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get(':handle/public')
  @ApiOperation({ summary: 'Perfil público da creator — sem auth (tayro.app/c/:handle)' })
  getPublicProfile(@Param('handle') handle: string) {
    return this.creatorsService.getPublicProfile(handle);
  }
}
