import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CourseLevel } from '../../entities/course/course.entity';
import { isValidCodeLanguage } from '../../common/constants/supported-languages';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidCodeLanguage', async: false })
export class IsValidCodeLanguageConstraint implements ValidatorConstraintInterface {
  validate(language: string) {
    return isValidCodeLanguage(language);
  }

  defaultMessage() {
    return 'language must be one of: javascript, typescript, python, java, gcc (C), cpp (C++), rust, go, ruby, php';
  }
}

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title (3-200 characters)',
    minimum: 3,
    maximum: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Course subtitle (maximum 240 characters)',
    maximum: 240,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @ApiProperty({
    description: 'Course description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Course level',
    enum: CourseLevel,
  })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({
    description:
      'Programming language (javascript, typescript, python, java, gcc, cpp, rust, go, ruby, php)',
    default: 'javascript',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Validate(IsValidCodeLanguageConstraint)
  language?: string = 'javascript';

  @ApiProperty({
    description: 'S3 key for course thumbnail',
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailS3Key?: string;

  @ApiProperty({
    description: 'URL for course trailer',
    required: false,
  })
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @ApiProperty({
    description: 'Course price in cents',
    default: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceCents?: number = 0;

  @ApiProperty({
    description: 'Currency code (e.g., IDR, USD)',
    default: 'IDR',
    maxLength: 3,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string = 'IDR';

  @ApiProperty({
    description: 'Whether course is published',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;
}

export class UpdateCourseDto {
  @ApiProperty({
    description: 'Course title (3-200 characters)',
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
    description: 'Course subtitle (maximum 240 characters)',
    maximum: 240,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @ApiProperty({
    description: 'Course description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Course level',
    enum: CourseLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiProperty({
    description: 'Programming language',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Validate(IsValidCodeLanguageConstraint)
  language?: string;

  @ApiProperty({
    description: 'S3 key for course thumbnail',
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailS3Key?: string;

  @ApiProperty({
    description: 'URL for course trailer',
    required: false,
  })
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @ApiProperty({
    description: 'Course price in cents',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceCents?: number;

  @ApiProperty({
    description: 'Currency code',
    maxLength: 3,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;

  @ApiProperty({
    description: 'Whether course is published',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
