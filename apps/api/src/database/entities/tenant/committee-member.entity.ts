import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import type { CommitteeMemberRole } from '@tms/types';

@Entity('committee_members')
export class CommitteeMemberEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', length: 64 })
  committeeId!: string;

  @Column({ name: 'user_id', length: 128 })
  userId!: string;

  @Column({ name: 'display_title', length: 128, nullable: true })
  displayTitle?: string;

  @Column({ name: 'photo_url', length: 512, nullable: true })
  photoUrl?: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({
    type: 'enum',
    enum: ['chair', 'vice_chair', 'secretary', 'member'],
  })
  role!: CommitteeMemberRole;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
