import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLearningPathDto {
  @ApiProperty({
    description: 'Learning path slug (unique identifier)',
  })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Learning path title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Learning path description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Path inclusion criteria',
    required: false,
  })
  @IsOptional()
  @IsObject()
  criteria?: Record<string, any>;

  @ApiProperty({
    description: 'Whether path is publicly visible',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
