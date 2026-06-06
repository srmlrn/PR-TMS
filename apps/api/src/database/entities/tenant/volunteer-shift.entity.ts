import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  VolunteerCategory,
  VolunteerShiftRole,
  VolunteerSignup,
} from '@tms/types';

@Entity('volunteer_shifts')
export class VolunteerShiftEntity {
  @PrimaryGeneratedColumn('uuid')
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
  description?: string | null;

  @Column({ length: 256, nullable: true })
  location?: string | null;

  @Column({ length: 32, nullable: true })
  role?: VolunteerShiftRole | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId?: string | null;

  @Column({ name: 'event_name', length: 256, nullable: true })
  eventName?: string | null;

  @Column({ length: 256, nullable: true })
  coordinator?: string | null;

  @Column({ length: 32, nullable: true })
  category?: VolunteerCategory | null;

  @Column({ name: 'is_recurring_template', default: false })
  isRecurringTemplate!: boolean;

  @Column({ name: 'template_key', length: 64, nullable: true })
  templateKey?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
