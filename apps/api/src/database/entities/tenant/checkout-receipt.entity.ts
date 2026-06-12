import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('checkout_receipts')
export class CheckoutReceiptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'receipt_number', length: 64 })
  receiptNumber!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ name: 'payment_session_id', type: 'uuid', nullable: true })
  paymentSessionId?: string;

  @Column({ name: 'grand_total', type: 'decimal', precision: 12, scale: 2 })
  grandTotal!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ length: 16, default: 'counter' })
  channel!: string;

  @Column({ name: 'payment_method', length: 32, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'issued_at' })
  issuedAt!: Date;
}
