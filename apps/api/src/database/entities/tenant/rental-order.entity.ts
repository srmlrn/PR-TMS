import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rental_orders')
export class RentalOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_name', length: 255 })
  clientName!: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId?: string;

  @Column({ name: 'asset_lines', type: 'jsonb', default: [] })
  assetLines!: { assetId: string; quantity: number }[];

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount!: number;

  @Column({ name: 'balance_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  balanceAmount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ length: 32, default: 'quoted' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
