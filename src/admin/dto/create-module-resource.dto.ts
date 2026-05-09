import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateModuleResourceDto {
  @ApiProperty({
    description: 'Resource label (1-180 characters)',
    minimum: 1,
    maximum: 180,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  label: string;

  @ApiProperty({
    description: 'Resource type (1-40 characters)',
    minimum: 1,
    maximum: 40,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  resourceType: string;

  @ApiProperty({
    description: 'S3 key for the resource (1+ characters)',
    minimum: 1,
  })
  @IsString()
  @MinLength(1)
  s3Key: string;
}

export class UpdateModuleResourceDto {
  @ApiProperty({
    description: 'Resource label (1-180 characters)',
    minimum: 1,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  label?: string;

  @ApiProperty({
    description: 'Resource type (1-40 characters)',
    minimum: 1,
    maximum: 40,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  resourceType?: string;

  @ApiProperty({
    description: 'S3 key for the resource (1+ characters)',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  s3Key?: string;
}

export class UploadModuleResourceDto {
  @ApiProperty({
    description: 'Resource label (maximum 180 characters)',
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  label?: string;

  @ApiProperty({
    description: 'Resource type (maximum 40 characters)',
    maximum: 40,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  resourceType?: string;
}
