import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CodeSubmission } from './code-submission.entity';

@Entity('submission_events')
export class SubmissionEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'uuid', name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'varchar', length: 60, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  
  @ManyToOne(() => CodeSubmission, (submission) => submission.events)
  @JoinColumn({ name: 'submission_id' })
  submission: CodeSubmission;
}
