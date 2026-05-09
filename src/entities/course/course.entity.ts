import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import { Unit } from './unit.entity';
import { ForumPost } from '../forum-post.entity';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  subtitle: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: CourseLevel,
  })
  level: CourseLevel;

  @Column({
    type: 'varchar',
    length: 40,
    default: 'javascript',
    comment:
      'Programming language code (e.g. javascript, python, go, not human language)',
  })
  language: string;

  @Column({ type: 'text', nullable: true, name: 'thumbnail_s3_key' })
  thumbnailS3Key: string;

  @Column({ type: 'text', nullable: true, name: 'trailer_url' })
  trailerUrl: string;

  @Column({ type: 'boolean', default: false, name: 'is_published' })
  isPublished: boolean;

  @Column({ type: 'integer', default: 0, name: 'price_cents' })
  priceCents: number;

  @Column({ type: 'char', length: 3, default: 'IDR', name: 'currency_code' })
  currencyCode: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Unit, (unit) => unit.course)
  units: Unit[];

  @OneToMany(() => ForumPost, (post) => post.course)
  forumPosts: ForumPost[];
}
