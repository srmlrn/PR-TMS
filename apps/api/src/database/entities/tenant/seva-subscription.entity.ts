import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('seva_subscriptions')
export class SevaSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @Column({ length: 16 })
  frequency!: string;

  @Column({ length: 16, default: 'active' })
  status!: string;

  @Column({ name: 'next_date', type: 'date' })
  nextDate!: Date;

  @Column({ type: 'jsonb', nullable: true })
  sankalpa?: Record<string, string | number | boolean>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
