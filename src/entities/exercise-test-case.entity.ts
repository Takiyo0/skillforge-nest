import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exercise } from './exercise.entity';

@Entity('exercise_test_cases')
export class ExerciseTestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'exercise_id' })
  exerciseId: string;

  @Column({ type: 'text', nullable: true, name: 'input_text' })
  inputText: string;

  @Column({ type: 'text', name: 'expected_output' })
  expectedOutput: string;

  @Column({ type: 'boolean', name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 1 })
  weight: number;

  
  @ManyToOne(() => Exercise, (exercise) => exercise.testCases)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;
}
