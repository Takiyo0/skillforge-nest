import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Unit } from './course/unit.entity';
import { FinalExamComponent } from './final-exam-component.entity';

@Entity('final_exams')
export class FinalExam {
  @PrimaryColumn({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @Column({ type: 'varchar', length: 220 })
  title: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'passing_score',
    default: 75.0,
  })
  passingScore: number;

  @Column({
    type: 'int',
    name: 'max_attempts',
    default: 3,
  })
  maxAttempts: number;

  @Column({
    type: 'int',
    nullable: true,
    name: 'time_limit_seconds',
  })
  timeLimitSeconds: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  
  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @OneToMany(() => FinalExamComponent, (component) => component.finalExam)
  components: FinalExamComponent[];
}
