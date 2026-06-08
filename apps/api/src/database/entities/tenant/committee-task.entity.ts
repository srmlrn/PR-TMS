import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitteeTaskPriority, CommitteeTaskStatus } from '@tms/types';

@Entity('committee_tasks')
export class CommitteeTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', type: 'uuid' })
  committeeId!: string;

  @Column({ length: 256 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'assignee_user_id', type: 'uuid', nullable: true })
  assigneeUserId?: string;

  @Column({ name: 'assignee_name', length: 128, nullable: true })
  assigneeName?: string;

  @Column({
    type: 'enum',
    enum: ['todo', 'in_progress', 'done', 'blocked'],
    default: 'todo',
  })
  status!: CommitteeTaskStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  priority!: CommitteeTaskPriority;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId?: string;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
