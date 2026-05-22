import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum UserRoleEnum {
  LEARNER = 'learner',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @PrimaryColumn({
    type: 'enum',
    enum: UserRoleEnum,
  })
  role: UserRoleEnum;

  @CreateDateColumn({ type: 'timestamptz', name: 'assigned_at' })
  assignedAt: Date;

  @ManyToOne(() => User, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
