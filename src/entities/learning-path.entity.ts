import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LearningPathCourse } from './learning-path-course.entity';

@Entity('learning_paths')
export class LearningPath {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'jsonb',
    default: {},
    comment:
      'Matching criteria for auto-assignment (e.g., {wantToLearn: ["Backend"], languages: ["go"]})',
  })
  criteria: Record<string, any>;

  @Column({ type: 'boolean', default: true, name: 'is_public' })
  isPublic: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  
  @OneToMany(() => LearningPathCourse, (lpc) => lpc.learningPath)
  courses: LearningPathCourse[];
}
