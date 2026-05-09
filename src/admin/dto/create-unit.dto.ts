import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UnitType } from '../../entities/course/unit.entity';

export class CreateUnitDto {
  @ApiProperty({
    description: 'Unit title (3-200 characters)',
    minimum: 3,
    maximum: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Unit summary',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Unit type',
    enum: UnitType,
  })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiProperty({
    description: 'Position of unit (minimum 1). If not provided, will be set to next position automatically',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  position?: number;

  @ApiProperty({
    description: 'Estimated time in minutes (minimum 0)',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  estimatedMinutes?: number;

  @ApiProperty({
    description: 'Whether unit is published',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;
}

export class UpdateUnitDto {
  @ApiProperty({
    description: 'Unit title (3-200 characters)',
    minimum: 3,
    maximum: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Unit summary',
    required: false,
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    description: 'Unit type',
    enum: UnitType,
    required: false,
  })
  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType;

  @ApiProperty({
    description: 'Position of unit (minimum 1)',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  position?: number;

  @ApiProperty({
    description: 'Estimated time in minutes (minimum 0)',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  estimatedMinutes?: number;

  @ApiProperty({
    description: 'Whether unit is published',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateUnitPrerequisiteDto {
  @ApiProperty({
    description: 'Prerequisite unit ID',
  })
  @IsString()
  prerequisiteUnitId: string;
}
