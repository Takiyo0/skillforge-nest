import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, maximum 128 characters)',
    minimum: 8,
    maximum: 128,
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    description: 'User display name (2-120 characters)',
    minimum: 2,
    maximum: 120,
  })
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  displayName: string;
}
