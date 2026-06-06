import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_sessions')
export class PaymentSessionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 8 })
  currency!: string;

  @Column({ length: 32 })
  provider!: string;

  @Column({ length: 32, default: 'pending' })
  status!: string;

  @Column({ length: 256 })
  purpose!: string;

  @Column({ name: 'devotee_id', type: 'uuid', nullable: true })
  devoteeId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, string>;

  @Column({ name: 'provider_ref_id', length: 128, nullable: true })
  providerRefId?: string;

  @Column({ name: 'client_secret', length: 256, nullable: true })
  clientSecret?: string;

  @Column({ name: 'payment_mode', length: 16, nullable: true })
  paymentMode?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
