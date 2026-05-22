import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_options')
export class QuizOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId: string;

  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'boolean', name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ type: 'int' })
  position: number;

  @ManyToOne(() => QuizQuestion, (question) => question.options)
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;
}
