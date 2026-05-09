import { ApiProperty } from '@nestjs/swagger';

export class TestCasePreviewDto {
  @ApiProperty({
    description: 'Test input',
  })
  inputText: string;

  @ApiProperty({
    description: 'Expected output',
  })
  expectedOutput: string;
}

export class ExerciseResponseDto {
  @ApiProperty({
    description: 'Exercise ID',
  })
  id: string;

  @ApiProperty({
    description: 'Unit ID',
  })
  unitId: string;

  @ApiProperty({
    description: 'Exercise difficulty level',
  })
  difficulty: string;

  @ApiProperty({
    description: 'Exercise title',
  })
  title: string;

  @ApiProperty({
    description: 'Exercise prompt in markdown format',
  })
  promptMarkdown: string;

  @ApiProperty({
    description: 'Programming language',
  })
  language: string;

  @ApiProperty({
    description: 'Starter code template',
  })
  starterCode: string;

  @ApiProperty({
    description: 'Maximum CPU time in milliseconds',
  })
  maxCpuMs: number;

  @ApiProperty({
    description: 'Maximum memory in kilobytes',
  })
  maxMemoryKb: number;

  @ApiProperty({
    description: 'Visible test cases for preview',
    type: [TestCasePreviewDto],
  })
  visibleTestCases: TestCasePreviewDto[];
}
