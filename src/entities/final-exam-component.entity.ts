import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FinalExam } from './final-exam.entity';
import { Quiz } from './quiz.entity';
import { Exercise } from './exercise.entity';

export enum FinalExamComponentType {
  QUIZ = 'quiz',
  EXERCISE = 'exercise',
}

@Entity('final_exam_components')
export class FinalExamComponent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'final_exam_unit_id' })
  finalExamUnitId: string;

  @Column({
    type: 'enum',
    enum: FinalExamComponentType,
    name: 'component_type',
  })
  componentType: FinalExamComponentType;

  @Column({ type: 'uuid', nullable: true, name: 'quiz_id' })
  quizId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'exercise_id' })
  exerciseId: string | null;

  @Column({ type: 'int' })
  position: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 1,
  })
  weight: number;

  @ManyToOne(() => FinalExam, (exam) => exam.components)
  @JoinColumn({ name: 'final_exam_unit_id', referencedColumnName: 'unitId' })
  finalExam: FinalExam;

  @ManyToOne(() => Quiz, { nullable: true })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz | null;

  @ManyToOne(() => Exercise, { nullable: true })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise | null;
}
