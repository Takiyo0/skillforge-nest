import {ArrayMaxSize, IsArray, IsUUID, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AnswerSubmissionDto {
  @ApiProperty({
    description: 'Question ID (UUID)',
  })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'Selected option IDs',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('4', {each: true})
  selectedOptionIds: string[];
}

export class FinalExamSubmissionDto {
  @ApiProperty({
    description: 'Array of answer submissions',
    type: [AnswerSubmissionDto],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AnswerSubmissionDto)
  answers: AnswerSubmissionDto[];
}
