import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Exercise } from './exercise.entity';
import { SubmissionTestResult } from './submission-test-result.entity';
import { SubmissionEvent } from './submission-event.entity';
import { AiReviewJob } from './ai-review-job.entity';
import { SubmissionStatus } from './submission-kind.enum';

export enum SubmissionKind {
  EXERCISE_NORMAL = 'exercise_normal',
  EXERCISE_ADVANCED = 'exercise_advanced',
  FINAL_EXAM_EXERCISE = 'final_exam_exercise',
}

@Entity('code_submissions')
export class CodeSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @Column({ type: 'uuid', nullable: true, name: 'exercise_id' })
  exerciseId: string;

  @Column({
    type: 'enum',
    enum: SubmissionKind,
  })
  kind: SubmissionKind;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.QUEUED,
  })
  status: SubmissionStatus;

  @Column({ type: 'varchar', length: 40 })
  language: string;

  @Column({ type: 'text', name: 'source_code' })
  sourceCode: string;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  @Column({
    type: 'varchar',
    length: 60,
    name: 'queue_name',
    default: 'default',
  })
  queueName: string;

  // legacy
  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'judge0_token',
  })
  pistonToken: string;

  @Column({ type: 'text', nullable: true })
  stdout: string;

  @Column({ type: 'text', nullable: true })
  stderr: string;

  @Column({ type: 'text', nullable: true, name: 'compile_output' })
  compileOutput: string;

  @Column({ type: 'text', nullable: true, name: 'ai_summary' })
  aiSummary: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'ai_score',
  })
  aiScore: number;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'ai_model' })
  aiModel: string;

  @Column({ type: 'text', nullable: true, name: 'ai_code_explanation' })
  aiCodeExplanation: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'queued_at' })
  queuedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'finished_at' })
  finishedAt: Date;

  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Exercise, (exercise) => exercise.submissions, {
    nullable: true,
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @OneToMany(() => SubmissionTestResult, (result) => result.submission)
  testResults: SubmissionTestResult[];

  @OneToMany(() => SubmissionEvent, (event) => event.submission)
  events: SubmissionEvent[];

  @OneToOne(() => AiReviewJob, (job) => job.submission, { nullable: true })
  aiReviewJob: AiReviewJob;
}
