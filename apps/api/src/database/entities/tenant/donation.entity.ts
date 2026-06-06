import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('donations')
export class DonationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ length: 128 })
  purpose!: string;

  @Column({ length: 32, default: 'one_time' })
  frequency!: string;

  @Column({ name: 'receipt_number', length: 64 })
  receiptNumber!: string;

  @Column({ name: 'tax_compliant', default: true })
  taxCompliant!: boolean;

  @Column({ name: 'tax_id', length: 64, nullable: true })
  taxId?: string;

  @Column({ name: 'payment_status', length: 32, default: 'paid' })
  paymentStatus!: string;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId?: string;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous!: boolean;

  @Column({ name: 'is_in_kind', default: false })
  isInKind!: boolean;

  @Column({ name: 'in_kind_description', length: 512, nullable: true })
  inKindDescription?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
