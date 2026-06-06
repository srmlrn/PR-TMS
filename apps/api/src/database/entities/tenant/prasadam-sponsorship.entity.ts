import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('prasadam_sponsorships')
export class PrasadamSponsorshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 32 })
  type!: string;

  @Column({ name: 'package_tier', length: 32 })
  packageTier!: string;

  @Column({ name: 'devotee_id', type: 'uuid' })
  devoteeId!: string;

  @Column({ name: 'scheduled_date', type: 'date' })
  scheduledDate!: string;

  @Column({ length: 128 })
  deity!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ type: 'jsonb' })
  sankalpa!: Record<string, string>;

  @Column({ name: 'receipt_number', length: 64, nullable: true })
  receiptNumber?: string;

  @Column({ length: 32, default: 'booked' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
