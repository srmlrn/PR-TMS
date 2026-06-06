import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { StaffRole } from '@tms/types';

@Entity('staff')
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'enum', enum: ['priest', 'frontdesk', 'volunteer'] })
  role!: StaffRole;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
