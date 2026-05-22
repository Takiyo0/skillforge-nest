import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CodeSubmission } from './code-submission.entity';
import { SubmissionStatus } from './submission-kind.enum';

@Entity('ai_review_jobs')
export class AiReviewJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true, name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'varchar', length: 40, default: 'ollama' })
  provider: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.QUEUED,
  })
  status: SubmissionStatus;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    name: 'prompt_template_version',
  })
  promptTemplateVersion: string;

  @Column({ type: 'jsonb', nullable: true, name: 'request_payload' })
  requestPayload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'response_payload' })
  responsePayload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => CodeSubmission, (submission) => submission.aiReviewJob)
  @JoinColumn({ name: 'submission_id' })
  submission: CodeSubmission;
}
