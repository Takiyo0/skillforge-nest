import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Unit } from './unit.entity';

@Entity('module_resources')
export class ModuleResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @Column({ type: 'varchar', length: 180 })
  label: string;

  @Column({ type: 'varchar', length: 40, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'text', name: 's3_key' })
  s3Key: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Unit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;
}
