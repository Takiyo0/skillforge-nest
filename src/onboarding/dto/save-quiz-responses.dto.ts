import {ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class QuizAnswer {
  @ApiProperty({
    description: 'Question ID',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  questionId: string;

  @ApiProperty({
    description: 'Answer value (string or array of strings)',
  })
  @IsNotEmpty()
  @MaxLength(1000, {each: true})
  answer: string | string[];
}

export class SaveQuizResponsesDto {
  @ApiProperty({
    description: 'Array of quiz answers',
    type: [QuizAnswer],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswer)
  responses: QuizAnswer[];
}
