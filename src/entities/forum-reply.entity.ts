import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ForumPost } from './forum-post.entity';

export enum ForumEntityStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  LOCKED = 'locked',
  DELETED = 'deleted',
}

@Entity('forum_replies')
export class ForumReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'post_id' })
  postId: string;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @Column({ type: 'uuid', nullable: true, name: 'parent_reply_id' })
  parentReplyId: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: ForumEntityStatus,
    default: ForumEntityStatus.VISIBLE,
  })
  status: ForumEntityStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  
  @ManyToOne(() => ForumPost, (post) => post.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @ManyToOne(() => User, (user) => user.forumReplies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToOne(() => ForumReply, (reply) => reply.childReplies, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_reply_id' })
  parentReply: ForumReply;

  @OneToMany(() => ForumReply, (reply) => reply.parentReply)
  childReplies: ForumReply[];
}
