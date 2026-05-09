import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuizOption } from './quiz-option.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

export enum QuizQuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
}

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'quiz_id' })
  quizId: string;

  @Column({
    type: 'enum',
    enum: QuizQuestionType,
    name: 'question_type',
  })
  questionType: QuizQuestionType;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 1 })
  points: number;

  @Column({ type: 'int' })
  position: number;

  
  @ManyToOne(() => Quiz, (quiz) => quiz.questions)
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @OneToMany(() => QuizOption, (option) => option.question)
  options: QuizOption[];

  @OneToMany(() => QuizAttemptAnswer, (answer) => answer.question)
  answers: QuizAttemptAnswer[];
}
