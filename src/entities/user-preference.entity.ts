import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { LearningPath } from './learning-path.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'uuid', name: 'learning_path_id', nullable: true })
  learningPathId: string | null;

  @Column({ type: 'boolean', default: false, name: 'dark_mode_enabled' })
  darkModeEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 16,
    default: 'id-ID',
    name: 'preferred_locale',
  })
  preferredLocale: string;

  @Column({ type: 'boolean', default: false, name: 'onboarding_completed' })
  onboardingCompleted: boolean;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  
  @OneToOne(() => User, (user) => user.preference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LearningPath, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'learning_path_id' })
  learningPath: LearningPath | null;
}
