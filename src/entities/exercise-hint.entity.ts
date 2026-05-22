import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exercise } from './exercise.entity';

@Entity('exercise_hints')
export class ExerciseHint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'text', name: 'hint_text' })
  hintText: string;

  @Column({
    type: 'int',
    name: 'unlock_after_failed_attempts',
    default: 3,
  })
  unlockAfterFailedAttempts: number;

  @Column({ type: 'int' })
  position: number;

  @ManyToOne(() => Exercise, (exercise) => exercise.hints)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;
}
