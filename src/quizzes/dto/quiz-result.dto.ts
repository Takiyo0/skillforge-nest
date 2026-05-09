import { ApiProperty } from '@nestjs/swagger';

export class QuizAnswerResultDto {
  @ApiProperty({
    description: 'Question ID',
  })
  questionId: string;

  @ApiProperty({
    description: 'Selected option IDs',
    type: [String],
  })
  selectedOptionIds: string[];

  @ApiProperty({
    description: 'Score awarded for this answer',
  })
  scoreAwarded: number;

  @ApiProperty({
    description: 'Explanation for the answer',
    required: false,
  })
  explanation?: string;
}

export class QuizResultDto {
  @ApiProperty({
    description: 'Attempt ID',
  })
  attemptId: string;

  @ApiProperty({
    description: 'Quiz ID',
  })
  quizId: string;

  @ApiProperty({
    description: 'Score percentage',
  })
  scorePercent: number;

  @ApiProperty({
    description: 'Whether the quiz was passed',
  })
  isPassed: boolean;

  @ApiProperty({
    description: 'Attempt number',
  })
  attemptNumber: number;

  @ApiProperty({
    description: 'Submission timestamp',
  })
  submittedAt: Date;

  @ApiProperty({
    description: 'Quiz answers and results',
    type: [QuizAnswerResultDto],
  })
  answers: QuizAnswerResultDto[];
}
