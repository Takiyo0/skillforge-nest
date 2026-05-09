import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CodeSubmission } from './code-submission.entity';
import { ExerciseTestCase } from './exercise-test-case.entity';

@Entity('submission_test_results')
export class SubmissionTestResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'uuid', nullable: true, name: 'test_case_id' })
  testCaseId: string;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean;

  @Column({ type: 'text', nullable: true, name: 'actual_output' })
  actualOutput: string;

  @Column({ type: 'text', nullable: true, name: 'expected_output' })
  expectedOutput: string;

  @Column({ type: 'int', nullable: true, name: 'execution_time_ms' })
  executionTimeMs: number;

  @Column({ type: 'int', nullable: true, name: 'memory_kb' })
  memoryKb: number;

  
  @ManyToOne(() => CodeSubmission, (submission) => submission.testResults)
  @JoinColumn({ name: 'submission_id' })
  submission: CodeSubmission;

  @ManyToOne(() => ExerciseTestCase, { nullable: true })
  @JoinColumn({ name: 'test_case_id' })
  testCase: ExerciseTestCase;
}
