import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { StaffLeaveStatus, StaffLeaveType } from '@tms/types';

@Entity('staff_leaves')
export class StaffLeaveEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId!: string;

  @Column({ type: 'enum', enum: ['annual', 'sick', 'personal', 'festival', 'other'] })
  type!: StaffLeaveType;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  })
  status!: StaffLeaveStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt!: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
