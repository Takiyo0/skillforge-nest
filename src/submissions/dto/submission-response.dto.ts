import { ApiProperty } from '@nestjs/swagger';

export class TestResultDto {
  @ApiProperty({
    description: 'Test case ID',
  })
  testCaseId: string;

  @ApiProperty({
    description: 'Whether test passed',
  })
  passed: boolean;

  @ApiProperty({
    description: 'Actual output',
    required: false,
  })
  actualOutput?: string;

  @ApiProperty({
    description: 'Expected output',
    required: false,
  })
  expectedOutput?: string;

  @ApiProperty({
    description: 'Execution time in milliseconds',
    required: false,
  })
  executionTimeMs?: number;

  @ApiProperty({
    description: 'Memory usage in kilobytes',
    required: false,
  })
  memoryKb?: number;
}

export class SubmissionResponseDto {
  @ApiProperty({
    description: 'Submission ID',
  })
  id: string;

  @ApiProperty({
    description: 'Submission status',
  })
  status: string;

  @ApiProperty({
    description: 'Submission type (exercise, etc)',
  })
  kind: string;

  @ApiProperty({
    description: 'Programming language',
  })
  language: string;

  @ApiProperty({
    description: 'Source code submitted',
    required: false,
  })
  sourceCode?: string;

  @ApiProperty({
    description: 'Attempt number',
  })
  attemptNumber: number;

  @ApiProperty({
    description: 'Timestamp when submission was queued',
  })
  queuedAt: Date;

  @ApiProperty({
    description: 'Timestamp when submission finished',
  })
  finishedAt: Date;

  @ApiProperty({
    description: 'Standard output from execution',
    required: false,
  })
  stdout?: string;

  @ApiProperty({
    description: 'Standard error from execution',
    required: false,
  })
  stderr?: string;

  @ApiProperty({
    description: 'Compilation output',
    required: false,
  })
  compileOutput?: string;

  @ApiProperty({
    description: 'AI-generated summary of the submission',
    required: false,
  })
  aiSummary?: string;

  @ApiProperty({
    description: 'AI evaluation score',
    required: false,
  })
  aiScore?: number;

  @ApiProperty({
    description: 'Number of tests passed',
    required: false,
  })
  testsPassed?: number;

  @ApiProperty({
    description: 'Total number of visible tests',
    required: false,
  })
  totalTests?: number;

  @ApiProperty({
    description: 'Test case results (only visible tests)',
    type: [TestResultDto],
    required: false,
  })
  testResults?: TestResultDto[];
}
