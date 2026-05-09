import {
  IsOptional,
  MaxLength,
  MinLength,
  IsEmail,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User email address',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'User display name (2-120 characters)',
    required: false,
    minimum: 2,
    maximum: 120,
  })
  @IsOptional()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiProperty({
    description: 'User biography (maximum 1000 characters)',
    required: false,
    maximum: 1000,
  })
  @IsOptional()
  @MaxLength(1000)
  bio?: string;
}
