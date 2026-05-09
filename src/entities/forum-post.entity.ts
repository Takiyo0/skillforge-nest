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
import { Course } from './course/course.entity';
import { ForumReply } from './forum-reply.entity';

export enum ForumEntityStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden',
  LOCKED = 'locked',
  DELETED = 'deleted',
}

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: ForumEntityStatus,
    default: ForumEntityStatus.VISIBLE,
  })
  status: ForumEntityStatus;

  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'NOW()',
    name: 'last_activity_at',
  })
  lastActivityAt: Date;

  
  @ManyToOne(() => Course, (course) => course.forumPosts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => User, (user) => user.forumPosts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @OneToMany(() => ForumReply, (reply) => reply.post, {
    cascade: true,
  })
  replies: ForumReply[];
}
