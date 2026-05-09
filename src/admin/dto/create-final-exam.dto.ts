import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FinalExamComponentType } from '../../entities/final-exam-component.entity';

export class CreateFinalExamComponentDto {
  @ApiProperty({
    description: 'Type of exam component (quiz or exercise)',
    enum: FinalExamComponentType,
  })
  @IsEnum(FinalExamComponentType)
  componentType: FinalExamComponentType;

  @ApiProperty({
    description: 'Quiz ID (required if componentType is quiz)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  quizId?: string;

  @ApiProperty({
    description: 'Exercise ID (required if componentType is exercise)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @ApiProperty({
    description: 'Position of component (minimum 1)',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  position: number;

  @ApiProperty({
    description: 'Weight of component in final exam (minimum 0.1)',
    default: 1,
    minimum: 0.1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  weight?: number = 1;
}

export class CreateFinalExamDto {
  @ApiProperty({
    description: 'Final exam title (3-220 characters)',
    minimum: 3,
    maximum: 220,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(220)
  title: string;

  @ApiProperty({
    description: 'Passing score percentage (0-100)',
    default: 75,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  passingScore?: number = 75;

  @ApiProperty({
    description: 'Maximum attempts (minimum 1)',
    default: 3,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAttempts?: number = 3;

  @ApiProperty({
    description: 'Time limit in seconds (minimum 60)',
    minimum: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Type(() => Number)
  timeLimitSeconds?: number;

  @ApiProperty({
    description: 'Array of exam components',
    type: [CreateFinalExamComponentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFinalExamComponentDto)
  components: CreateFinalExamComponentDto[];
}

export class UpdateFinalExamDto {
  @ApiProperty({
    description: 'Final exam title (3-220 characters)',
    minimum: 3,
    maximum: 220,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(220)
  title?: string;

  @ApiProperty({
    description: 'Passing score percentage (0-100)',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  passingScore?: number;

  @ApiProperty({
    description: 'Maximum attempts (minimum 1)',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxAttempts?: number;

  @ApiProperty({
    description: 'Time limit in seconds (minimum 60)',
    minimum: 60,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Type(() => Number)
  timeLimitSeconds?: number;

  @ApiProperty({
    description: 'Array of exam components',
    type: [CreateFinalExamComponentDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFinalExamComponentDto)
  components?: CreateFinalExamComponentDto[];
}
