import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('donation_subscriptions')
export class DonationSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ name: 'donation_id', type: 'uuid' })
  donationId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ length: 128 })
  purpose!: string;

  @Column({ length: 32 })
  frequency!: string;

  @Column({ length: 32, default: 'active' })
  status!: string;

  @Column({ name: 'next_billing_at', type: 'timestamptz' })
  nextBillingAt!: Date;

  @Column({ name: 'last_payment_session_id', type: 'uuid', nullable: true })
  lastPaymentSessionId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
