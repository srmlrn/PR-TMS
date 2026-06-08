import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeRequestStatus, CommitteeRequestType } from '@tms/types';

@Entity('committee_requests')
export class CommitteeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', type: 'uuid' })
  committeeId!: string;

  @Column({
    type: 'enum',
    enum: ['calendar_block', 'budget', 'event', 'leave', 'task', 'general'],
  })
  type!: CommitteeRequestType;

  @Column({ length: 256 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  })
  status!: CommitteeRequestStatus;

  @Column({ name: 'requested_by_user_id', type: 'uuid' })
  requestedByUserId!: string;

  @Column({ name: 'requested_by_name', length: 128, nullable: true })
  requestedByName?: string;

  @Column({ name: 'reviewed_by_user_id', type: 'uuid', nullable: true })
  reviewedByUserId?: string;

  @Column({ name: 'reviewed_by_name', length: 128, nullable: true })
  reviewedByName?: string;

  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote?: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId?: string;

  @Column({ name: 'block_start_date', type: 'date', nullable: true })
  blockStartDate?: string;

  @Column({ name: 'block_end_date', type: 'date', nullable: true })
  blockEndDate?: string;

  @Column({ name: 'block_title', length: 128, nullable: true })
  blockTitle?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;
}
