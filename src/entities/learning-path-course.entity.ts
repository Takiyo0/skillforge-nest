import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LearningPath } from './learning-path.entity';
import { Course } from './course/course.entity';

@Entity('learning_path_courses')
export class LearningPathCourse {
  @Column({ type: 'uuid', name: 'learning_path_id', primary: true })
  learningPathId: string;

  @Column({ type: 'uuid', name: 'course_id', primary: true })
  courseId: string;

  @Column({ type: 'integer' })
  position: number;

  
  @ManyToOne(() => LearningPath, (lp) => lp.courses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'learning_path_id' })
  learningPath: LearningPath;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
