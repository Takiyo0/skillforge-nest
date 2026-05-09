import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_daily_streaks')
export class UserDailyStreak {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({
    type: 'integer',
    default: 0,
    name: 'current_streak_days',
    comment: 'Current consecutive days of activity',
  })
  currentStreakDays: number;

  @Column({
    type: 'integer',
    default: 0,
    name: 'longest_streak_days',
    comment: 'Longest streak ever achieved',
  })
  longestStreakDays: number;

  @Column({ type: 'date', nullable: true, name: 'last_activity_date' })
  lastActivityDate: Date | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
