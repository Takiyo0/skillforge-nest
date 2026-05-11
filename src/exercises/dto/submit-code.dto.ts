import { IsIn, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SUPPORTED_CODE_LANGUAGES } from '../../common/constants/supported-languages';

export class SubmitCodeDto {
  @ApiProperty({
    description: 'Exercise ID (UUID)',
  })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({
    description: 'Programming language for the code',
    enum: SUPPORTED_CODE_LANGUAGES,
  })
  @IsString()
  @IsIn(SUPPORTED_CODE_LANGUAGES)
  language: string;

  @ApiProperty({
    description: 'Source code to submit',
  })
  @IsString()
  sourceCode: string;
}
