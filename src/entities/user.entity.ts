import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from './user-role.entity';
import { UserPreference } from './user-preference.entity';
import { XpEvent } from './xp-event.entity';
import { UserBadge } from './user-badge.entity';
import { ForumPost } from './forum-post.entity';
import { ForumReply } from './forum-reply.entity';
import { ForumModerationAction } from './forum-moderation-action.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'text', name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 120, name: 'display_name' })
  displayName: string;

  @Column({ type: 'text', nullable: true, name: 'avatar_s3_key' })
  avatarS3Key: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user, { cascade: true })
  roles: UserRole[];

  @OneToOne(() => UserPreference, (preference) => preference.user, {
    cascade: true,
  })
  preference: UserPreference;

  @OneToMany(() => XpEvent, (xpEvent) => xpEvent.user)
  xpEvents: XpEvent[];

  @OneToMany(() => UserBadge, (userBadge) => userBadge.user)
  userBadges: UserBadge[];

  @OneToMany(() => ForumPost, (post) => post.author)
  forumPosts: ForumPost[];

  @OneToMany(() => ForumReply, (reply) => reply.author)
  forumReplies: ForumReply[];

  @OneToMany(() => ForumModerationAction, (action) => action.actor)
  moderationActions: ForumModerationAction[];
}
