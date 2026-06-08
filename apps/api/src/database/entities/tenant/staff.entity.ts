import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { StaffRole } from '@tms/types';

@Entity('staff')
export class StaffEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'enum', enum: ['priest', 'frontdesk', 'volunteer'] })
  role!: StaffRole;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ length: 128, nullable: true })
  title?: string;

  @Column({ length: 128, nullable: true })
  department?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
