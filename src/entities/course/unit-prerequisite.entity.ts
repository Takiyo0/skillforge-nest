import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Unit } from './unit.entity';

@Entity('unit_prerequisites')
export class UnitPrerequisite {
  @PrimaryColumn({ type: 'uuid', name: 'unit_id' })
  unitId: string;

  @PrimaryColumn({ type: 'uuid', name: 'prerequisite_unit_id' })
  prerequisiteUnitId: string;

  @ManyToOne(() => Unit, (unit) => unit.prerequisites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @ManyToOne(() => Unit, (unit) => unit.requiredFor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prerequisite_unit_id' })
  prerequisiteUnit: Unit;
}
