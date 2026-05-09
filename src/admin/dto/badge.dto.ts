import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SUPPORTED_CODE_LANGUAGES } from '../../common/constants/supported-languages';

export const BadgeCriteriaTypes = {
  FirstCourse: 'first_course',
  XpMilestone: 'xp_milestone',
} as const;

export type BadgeCriteriaType =
  (typeof BadgeCriteriaTypes)[keyof typeof BadgeCriteriaTypes];

export interface BadgeCriteriaFieldOption {
  value: string | number;
  label: string;
}

export interface BadgeCriteriaFieldDefinition {
  key: string;
  label: string;
  type: 'select' | 'number';
  required: boolean;
  options?: BadgeCriteriaFieldOption[];
  min?: number;
  step?: number;
  helperText?: string;
}

export interface BadgeCriteriaDefinition {
  type: BadgeCriteriaType;
  label: string;
  description: string;
  fields: BadgeCriteriaFieldDefinition[];
}

export class CreateBadgeDto {
  @ApiProperty({ description: 'Unique badge code', minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  code: string;

  @ApiProperty({ description: 'Badge display name', minLength: 3, maxLength: 120 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'Badge description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Badge icon S3 key', required: false })
  @IsOptional()
  @IsString()
  iconS3Key?: string;

  @ApiProperty({ enum: BadgeCriteriaTypes, description: 'Structured badge criteria type' })
  @IsEnum(BadgeCriteriaTypes)
  criteriaType: BadgeCriteriaType;

  @ApiProperty({
    description: 'Language for first_course badges',
    required: false,
    enum: SUPPORTED_CODE_LANGUAGES,
  })
  @ValidateIf((dto: CreateBadgeDto) => dto.criteriaType === BadgeCriteriaTypes.FirstCourse)
  @IsString()
  @IsIn(SUPPORTED_CODE_LANGUAGES)
  language?: string;

  @ApiProperty({
    description: 'XP threshold for xp_milestone badges',
    required: false,
    minimum: 1,
  })
  @ValidateIf((dto: CreateBadgeDto) => dto.criteriaType === BadgeCriteriaTypes.XpMilestone)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  xp?: number;
}

export class UpdateBadgeDto {
  @ApiProperty({ description: 'Badge code', required: false, minLength: 3, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  code?: string;

  @ApiProperty({ description: 'Badge display name', required: false, minLength: 3, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @ApiProperty({ description: 'Badge description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Badge icon S3 key', required: false })
  @IsOptional()
  @IsString()
  iconS3Key?: string;

  @ApiProperty({ enum: BadgeCriteriaTypes, description: 'Structured badge criteria type', required: false })
  @IsOptional()
  @IsEnum(BadgeCriteriaTypes)
  criteriaType?: BadgeCriteriaType;

  @ApiProperty({
    description: 'Language for first_course badges',
    required: false,
    enum: SUPPORTED_CODE_LANGUAGES,
  })
  @ValidateIf(
    (dto: UpdateBadgeDto) =>
      dto.criteriaType === BadgeCriteriaTypes.FirstCourse,
  )
  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_CODE_LANGUAGES)
  language?: string;

  @ApiProperty({
    description: 'XP threshold for xp_milestone badges',
    required: false,
    minimum: 1,
  })
  @ValidateIf(
    (dto: UpdateBadgeDto) =>
      dto.criteriaType === BadgeCriteriaTypes.XpMilestone,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  xp?: number;
}

export class BadgeCriteriaMetadataFieldDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: ['select', 'number'] })
  type: 'select' | 'number';

  @ApiProperty()
  required: boolean;

  @ApiProperty({
    required: false,
    description: 'Allowed values for select-based criteria fields',
  })
  @IsOptional()
  options?: BadgeCriteriaFieldOption[];

  @ApiProperty({ required: false })
  @IsOptional()
  min?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  step?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  helperText?: string;
}

export class BadgeCriteriaMetadataDto {
  @ApiProperty({ enum: BadgeCriteriaTypes })
  type: BadgeCriteriaType;

  @ApiProperty()
  label: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [BadgeCriteriaMetadataFieldDto] })
  fields: BadgeCriteriaMetadataFieldDto[];
}
