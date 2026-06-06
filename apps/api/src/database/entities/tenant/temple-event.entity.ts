import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('temple_events')
export class TempleEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 32 })
  type!: string;

  @Column({ length: 32, default: 'enquiry' })
  stage!: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'jsonb', default: [] })
  venues!: string[];

  @Column({ name: 'expected_footfall', nullable: true })
  expectedFootfall?: number;

  @Column({ name: 'budget_planned', type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetPlanned?: number;

  @Column({ name: 'revenue_target', type: 'decimal', precision: 12, scale: 2, nullable: true })
  revenueTarget?: number;

  @Column({ name: 'client_name', length: 255, nullable: true })
  clientName?: string;

  @Column({ name: 'client_contact', length: 255, nullable: true })
  clientContact?: string;

  @Column({ name: 'checklist_progress', type: 'jsonb', nullable: true })
  checklistProgress?: { done: number; total: number };

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
