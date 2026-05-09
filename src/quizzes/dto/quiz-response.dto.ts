import { ApiProperty } from '@nestjs/swagger';

export class QuizOptionResponseDto {
  @ApiProperty({
    description: 'Option ID',
  })
  id: string;

  @ApiProperty({
    description: 'Option label text',
  })
  label: string;
}

export class QuizQuestionResponseDto {
  @ApiProperty({
    description: 'Question ID',
  })
  id: string;

  @ApiProperty({
    description: 'Question type',
  })
  questionType: string;

  @ApiProperty({
    description: 'Question prompt',
  })
  prompt: string;

  @ApiProperty({
    description: 'Points for this question',
  })
  points: number;

  @ApiProperty({
    description: 'Position of question in quiz',
  })
  position: number;

  @ApiProperty({
    description: 'Whether multiple answers are allowed',
  })
  answerMultiple: boolean;

  @ApiProperty({
    description: 'Answer options',
    type: [QuizOptionResponseDto],
  })
  options: QuizOptionResponseDto[];
}

export class QuizResponseDto {
  @ApiProperty({
    description: 'Quiz ID',
  })
  id: string;

  @ApiProperty({
    description: 'Quiz title',
  })
  title: string;

  @ApiProperty({
    description: 'Quiz instructions',
  })
  instructions: string;

  @ApiProperty({
    description: 'Passing score percentage',
  })
  passingScore: number;

  @ApiProperty({
    description: 'Time limit in seconds',
  })
  timeLimitSeconds: number;

  @ApiProperty({
    description: 'Whether to randomize question order',
  })
  randomizeQuestions: boolean;

  @ApiProperty({
    description: 'Whether to randomize option order',
  })
  randomizeOptions: boolean;

  @ApiProperty({
    description: 'Quiz questions',
    type: [QuizQuestionResponseDto],
  })
  questions: QuizQuestionResponseDto[];
}
