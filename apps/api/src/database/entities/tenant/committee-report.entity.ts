import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeReportPeriod } from '@tms/types';

@Entity('committee_reports')
export class CommitteeReportEntity {
  @PrimaryColumn({ length: 64 })
  id!: string;

  @Column({ name: 'committee_id', length: 64 })
  committeeId!: string;

  @Column({
    type: 'enum',
    enum: ['monthly', 'quarterly'],
  })
  period!: CommitteeReportPeriod;

  @Column({ length: 256 })
  title!: string;

  @Column({ name: 'meeting_date', type: 'date' })
  meetingDate!: string;

  @Column({ name: 'minutes_summary', type: 'text', nullable: true })
  minutesSummary?: string;

  @Column({ name: 'attendance_count', type: 'int', nullable: true })
  attendanceCount?: number;

  @Column({ name: 'expected_attendance', type: 'int', nullable: true })
  expectedAttendance?: number;

  @Column({ name: 'created_by_user_id', length: 128, nullable: true })
  createdByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
