import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class QuizAnswer {
  @ApiProperty({
    description: 'Question ID',
  })
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Answer value (string or array of strings)',
  })
  @IsNotEmpty()
  answer: string | string[];
}

export class SaveQuizResponsesDto {
  @ApiProperty({
    description: 'Array of quiz answers',
    type: [QuizAnswer],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswer)
  responses: QuizAnswer[];
}
