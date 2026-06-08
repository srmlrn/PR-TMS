import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CommitteeMemberRole } from '@tms/types';

@Entity('committee_members')
export class CommitteeMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', type: 'uuid' })
  committeeId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

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
