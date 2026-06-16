import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-da-application' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ example: 'https://drive.google.com/video.mp4' })
  @IsUrl()
  mediaUrl: string;

  @ApiProperty({ enum: MediaType, example: MediaType.VIDEO })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiPropertyOptional({ example: 'Produto incrível! #fitness #parceria' })
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;
}
