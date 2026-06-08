import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  VolunteerCategory,
  VolunteerShiftRole,
  VolunteerSignup,
} from '@tms/types';

@Entity('volunteer_shifts')
export class VolunteerShiftEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ length: 256 })
  title!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ name: 'start_time', length: 8 })
  startTime!: string;

  @Column({ name: 'end_time', length: 8 })
  endTime!: string;

  @Column({ type: 'int', default: 1 })
  slots!: number;

  @Column({ type: 'jsonb', default: [] })
  signups!: VolunteerSignup[];

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  role?: string;

  @Column({ name: 'event_id', type: 'varchar', length: 64, nullable: true })
  eventId?: string;

  @Column({ name: 'event_name', type: 'varchar', length: 256, nullable: true })
  eventName?: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  coordinator?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  category?: string;

  @Column({ name: 'is_recurring_template', default: false })
  isRecurringTemplate!: boolean;

  @Column({ name: 'template_key', type: 'varchar', length: 64, nullable: true })
  templateKey?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
