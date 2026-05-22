import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'attempt_id' })
  attemptId: string;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId: string;

  @Column({
    type: 'uuid',
    array: true,
    name: 'selected_option_ids',
    default: [],
  })
  selectedOptionIds: string[];

  @Column({ type: 'text', nullable: true, name: 'answer_text' })
  answerText: string;

  @Column({ type: 'boolean', nullable: true, name: 'is_correct' })
  isCorrect: boolean;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
    name: 'score_awarded',
  })
  scoreAwarded: number;

  @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers)
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @ManyToOne(() => QuizQuestion, (question) => question.answers)
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;
}
