import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeTargetPeriod } from '@tms/types';

@Entity('committee_targets')
export class CommitteeTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', type: 'uuid' })
  committeeId!: string;

  @Column({ length: 256 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['monthly', 'quarterly', 'annual'],
  })
  period!: CommitteeTargetPeriod;

  @Column({ name: 'target_value', type: 'decimal', precision: 12, scale: 2 })
  targetValue!: number;

  @Column({ name: 'current_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentValue!: number;

  @Column({ length: 32, nullable: true })
  unit?: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
