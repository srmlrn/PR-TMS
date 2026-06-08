import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeMemberRole } from '@tms/types';

@Entity('committee_leadership')
export class CommitteeLeadershipEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ name: 'committee_id', length: 64 })
  committeeId!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['chair', 'vice_chair', 'secretary', 'member'],
  })
  role!: CommitteeMemberRole;

  @Column({ name: 'display_title', length: 128, nullable: true })
  displayTitle?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
