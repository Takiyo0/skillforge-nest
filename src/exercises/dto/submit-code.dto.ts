import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitCodeDto {
  @ApiProperty({
    description: 'Exercise ID (UUID)',
  })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({
    description: 'Programming language for the code',
  })
  @IsString()
  language: string;

  @ApiProperty({
    description: 'Source code to submit',
  })
  @IsString()
  sourceCode: string;
}
