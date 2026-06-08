import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('committee_calendar_blocks')
export class CommitteeCalendarBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', type: 'uuid' })
  committeeId!: string;

  @Column({ length: 128 })
  title!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'blocks_temple_calendar', default: true })
  blocksTempleCalendar!: boolean;

  @Column({ name: 'request_id', type: 'uuid', nullable: true })
  requestId?: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
