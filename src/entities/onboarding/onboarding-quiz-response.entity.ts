import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import { OnboardingQuizQuestion } from './onboarding-quiz-question.entity';

@Entity('onboarding_quiz_responses')
export class OnboardingQuizResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'question_id' })
  questionId: string;

  @Column({ type: 'jsonb' })
  answer: string | string[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => OnboardingQuizQuestion, (question) => question.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: OnboardingQuizQuestion;
}
