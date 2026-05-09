import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreateShowcaseDto {
  @ApiProperty({
    description: 'Course ID (UUID) for which the showcase is created',
    example: 'course-001',
  })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Showcase title (max 200 characters)',
    example: 'My First Web App',
    maxLength: 200,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Project description (max 2000 characters)',
    example: 'A todo list application built with React',
    required: false,
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Project URL or repository link',
    example: 'https://github.com/user/project',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  projectUrl?: string;

  @ApiProperty({
    description: 'Certificate ID associated with this showcase',
    example: 'cert-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  certificateId?: string;

  @ApiProperty({
    description: 'Whether the showcase should be publicly visible',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateShowcaseDto {
  @ApiProperty({
    description: 'Updated showcase title',
    example: 'My Updated Web App',
    required: false,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Updated project description',
    example: 'Updated description',
    required: false,
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Updated project URL',
    example: 'https://github.com/user/updated-project',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  projectUrl?: string;

  @ApiProperty({
    description: 'Updated visibility status',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
