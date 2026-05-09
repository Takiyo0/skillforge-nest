import { IsOptional, IsBoolean, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Enable dark mode',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  darkModeEnabled?: boolean;

  @ApiProperty({
    description: 'Preferred locale (format: en-US, id-ID, etc)',
    required: false,
    pattern: '^[a-z]{2}-[A-Z]{2}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, {
    message: 'preferredLocale must be in format: en-US, id-ID, etc',
  })
  preferredLocale?: string;
}
