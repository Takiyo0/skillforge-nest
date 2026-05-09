import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QuizAnswerDto {
  @ApiProperty({
    description: 'Question ID (UUID)',
  })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'Selected option IDs (UUIDs)',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds: string[];

  @ApiProperty({
    description: 'Answer text for text-based questions',
    required: false,
  })
  @IsOptional()
  @IsString()
  answerText?: string;
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Array of quiz answers',
    type: [QuizAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];
}
