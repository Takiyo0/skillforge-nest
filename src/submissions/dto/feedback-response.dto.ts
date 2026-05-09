import { ApiProperty } from '@nestjs/swagger';

export class HintDto {
  @ApiProperty({
    description: 'Hint text content',
  })
  hintText: string;

  @ApiProperty({
    description: 'Whether the hint is unlocked',
  })
  unlocked: boolean;

  @ApiProperty({
    description: 'Position of hint',
  })
  position: number;
}

export class TestResultDto {
  @ApiProperty({
    description: 'Whether test passed',
  })
  passed: boolean;

  @ApiProperty({
    description: 'Actual output',
  })
  actualOutput: string;

  @ApiProperty({
    description: 'Expected output',
  })
  expectedOutput: string;
}

export class FeedbackResponseDto {
  @ApiProperty({
    description: 'Submission ID',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Feedback status',
  })
  status: string;

  @ApiProperty({
    description: 'Number of tests passed',
  })
  testsPassed: number;

  @ApiProperty({
    description: 'Total number of visible tests',
  })
  totalTests: number;

  @ApiProperty({
    description: 'Hints for the submission',
    type: [HintDto],
  })
  hints: HintDto[];

  @ApiProperty({
    description: 'Test results (only visible tests)',
    type: [TestResultDto],
  })
  testResults: TestResultDto[];
}
