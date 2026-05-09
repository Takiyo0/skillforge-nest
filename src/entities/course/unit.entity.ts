import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { UnitPrerequisite } from './unit-prerequisite.entity';
import { ModuleContent } from './module-content.entity';
import { ModuleResource } from './module-resource.entity';
import { Quiz } from '../quiz.entity';
import { Exercise } from '../exercise.entity';

export enum UnitType {
  MODULE = 'module',
  EXERCISE = 'exercise',
  ASSESSMENT = 'assessment',
  FINAL_EXAM = 'final_exam',
}

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: UnitType,
  })
  type: UnitType;

  @Column({ type: 'varchar', length: 220 })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'integer', nullable: true, name: 'estimated_minutes' })
  estimatedMinutes: number;

  @Column({ type: 'boolean', default: false, name: 'is_published' })
  isPublished: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Course, (course) => course.units)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => UnitPrerequisite, (prereq) => prereq.unit)
  prerequisites: UnitPrerequisite[];

  @OneToMany(() => UnitPrerequisite, (prereq) => prereq.prerequisiteUnit)
  requiredFor: UnitPrerequisite[];

  @OneToMany(() => ModuleContent, (content) => content.unit, { nullable: true })
  moduleContent: ModuleContent;

  @OneToMany(() => ModuleResource, (resource) => resource.unit)
  moduleResources: ModuleResource[];

  @OneToMany(() => Quiz, (quiz) => quiz.unit)
  quizzes: Quiz[];

  @OneToOne(() => Exercise, (exercise) => exercise.unit, { nullable: true })
  exercises: Exercise;
}
