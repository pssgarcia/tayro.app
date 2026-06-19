import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from '../application/brands.service';
import { UpdateBrandDto } from '../application/dtos/update-brand.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('brands')
@Controller('brands')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Perfil da marca autenticada (Brand)' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.brandsService.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles('BRAND')
  @ApiOperation({ summary: 'Atualizar perfil da marca autenticada (Brand)' })
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateBrandDto) {
    return this.brandsService.updateMe(user.id, dto);
  }
}
