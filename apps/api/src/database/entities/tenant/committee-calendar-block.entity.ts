import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('committee_calendar_blocks')
export class CommitteeCalendarBlockEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', length: 64 })
  committeeId!: string;

  @Column({ length: 128 })
  title!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'block_type', length: 16, default: 'committee' })
  blockType!: 'committee' | 'personal' | 'temple';

  @Column({ name: 'blocks_temple_calendar', default: true })
  blocksTempleCalendar!: boolean;

  @Column({ name: 'request_id', length: 64, nullable: true })
  requestId?: string;

  @Column({ name: 'created_by_user_id', length: 128, nullable: true })
  createdByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
