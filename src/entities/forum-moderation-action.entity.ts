import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ModerationTargetType {
  POST = 'post',
  REPLY = 'reply',
}

export enum ModerationActionType {
  HIDE = 'hide',
  UNHIDE = 'unhide',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  DELETE = 'delete',
}

@Entity('forum_moderation_actions')
export class ForumModerationAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'actor_user_id' })
  actorUserId: string;

  @Column({
    type: 'enum',
    enum: ModerationTargetType,
    name: 'target_type',
  })
  targetType: ModerationTargetType;

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string;

  @Column({
    type: 'enum',
    enum: ModerationActionType,
  })
  action: ModerationActionType;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.moderationActions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;
}
