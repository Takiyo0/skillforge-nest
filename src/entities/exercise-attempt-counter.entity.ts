import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Exercise } from './exercise.entity';

@Entity('exercise_attempt_counters')
export class ExerciseAttemptCounter {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @PrimaryColumn({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'int', name: 'failed_attempts', default: 0 })
  failedAttempts: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_failed_at' })
  lastFailedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_passed_at' })
  lastPassedAt: Date;

  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Exercise)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;
}
