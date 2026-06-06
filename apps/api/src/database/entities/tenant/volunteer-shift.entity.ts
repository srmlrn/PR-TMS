import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { VolunteerSignup } from '@tms/types';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
