import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Unit } from './course/unit.entity';
import { ExerciseTestCase } from './exercise-test-case.entity';
import { ExerciseHint } from './exercise-hint.entity';
import { CodeSubmission } from './code-submission.entity';

export enum ChallengeDifficulty {
  NORMAL = 'normal',
  ADVANCED = 'advanced',
}

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'unit_id', unique: true })
  unitId: string;

  @Column({
    type: 'enum',
    enum: ChallengeDifficulty,
  })
  difficulty: ChallengeDifficulty;

  @Column({ type: 'varchar', length: 220 })
  title: string;

  @Column({ type: 'text', name: 'prompt_markdown' })
  promptMarkdown: string;

  @Column({ type: 'varchar', length: 40 })
  language: string;

  @Column({ type: 'text', nullable: true, name: 'starter_code' })
  starterCode: string;

  @Column({ type: 'int', nullable: true, name: 'max_cpu_ms' })
  maxCpuMs: number;

  @Column({ type: 'int', nullable: true, name: 'max_memory_kb' })
  maxMemoryKb: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  
  @ManyToOne(() => Unit, (unit) => unit.exercises)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @OneToMany(() => ExerciseTestCase, (testCase) => testCase.exercise)
  testCases: ExerciseTestCase[];

  @OneToMany(() => ExerciseHint, (hint) => hint.exercise)
  hints: ExerciseHint[];

  @OneToMany(() => CodeSubmission, (submission) => submission.exercise)
  submissions: CodeSubmission[];
}
