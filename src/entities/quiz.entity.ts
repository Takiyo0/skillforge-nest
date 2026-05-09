import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Unit } from './course/unit.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'unit_id', nullable: true })
  unitId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'passing_score',
    default: 70.0,
  })
  passingScore: number;

  @Column({ type: 'int', name: 'time_limit_seconds', nullable: true })
  timeLimitSeconds: number;

  @Column({
    type: 'boolean',
    name: 'randomize_questions',
    default: false,
  })
  randomizeQuestions: boolean;

  @Column({
    type: 'boolean',
    name: 'randomize_options',
    default: false,
  })
  randomizeOptions: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  
  @ManyToOne(() => Unit, (unit) => unit.quizzes, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @OneToMany(() => QuizQuestion, (question) => question.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
  attempts: QuizAttempt[];
}
