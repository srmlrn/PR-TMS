import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ name: 'service_id', type: 'uuid' })
  serviceId!: string;

  @Column({ name: 'priest_id', type: 'uuid', nullable: true })
  priestId?: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ length: 32, default: 'confirmed' })
  status!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'jsonb', nullable: true })
  sankalpa?: Record<string, string>;

  @Column({ name: 'receipt_number', length: 64, nullable: true })
  receiptNumber?: string;

  @Column({ length: 16, default: 'app' })
  channel!: string;

  @Column({ name: 'payment_status', length: 32, default: 'paid' })
  paymentStatus!: string;

  @Column({ name: 'honorarium_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  honorariumAmount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
