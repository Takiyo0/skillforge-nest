import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from '../user.entity';
import { Course } from '../course/course.entity';
import { Unit } from '../course/unit.entity';
import { Enrollment } from './enrollment.entity';

@Entity('course_progress')
export class CourseProgress {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @PrimaryColumn({ type: 'uuid', name: 'course_id' })
  courseId: string;

  @Column({ type: 'integer', default: 0, name: 'completed_units' })
  completedUnits: number;

  @Column({ type: 'integer', default: 0, name: 'total_units' })
  totalUnits: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'progress_percent',
  })
  progressPercent: number;

  @Column({ type: 'uuid', nullable: true, name: 'current_unit_id' })
  currentUnitId: string | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'current_unit_id' })
  currentUnit: Unit;

  @OneToOne(() => Enrollment, (enrollment) => enrollment.courseProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'user_id', referencedColumnName: 'userId' },
    { name: 'course_id', referencedColumnName: 'courseId' },
  ])
  enrollment: Enrollment;
}
