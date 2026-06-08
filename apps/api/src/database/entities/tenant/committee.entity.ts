import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeCategory, CommitteeType, MeetingCadence } from '@tms/types';

@Entity('committees')
export class CommitteeEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ length: 64 })
  slug!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  purpose?: string;

  @Column({
    type: 'enum',
    enum: [
      'governance',
      'religious',
      'cultural',
      'education',
      'operations',
      'outreach',
      'staff',
    ],
    default: 'governance',
  })
  category!: CommitteeCategory;

  @Column({
    name: 'committee_type',
    type: 'enum',
    enum: ['standing', 'ad_hoc', 'staff'],
    default: 'standing',
  })
  committeeType!: CommitteeType;

  @Column({ name: 'meeting_cadence', length: 32, nullable: true })
  meetingCadence?: MeetingCadence;

  @Column({ name: 'public_roster', default: false })
  publicRoster!: boolean;

  @Column({ name: 'seed_version', length: 32, nullable: true })
  seedVersion?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
