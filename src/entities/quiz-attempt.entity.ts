import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from './user.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'quiz_id' })
  quizId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'submitted_at' })
  submittedAt: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'score_percent',
  })
  scorePercent: number;

  @Column({ type: 'boolean', nullable: true, name: 'is_passed' })
  isPassed: boolean;

  @Column({ type: 'int', name: 'attempt_number' })
  attemptNumber: number;

  
  @ManyToOne(() => Quiz, (quiz) => quiz.attempts)
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => QuizAttemptAnswer, (answer) => answer.attempt)
  answers: QuizAttemptAnswer[];
}
