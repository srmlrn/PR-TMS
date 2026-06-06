import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('rental_assets')
export class RentalAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 128 })
  name!: string;

  @Column({ length: 32 })
  category!: string;

  @Column({ default: 1 })
  quantity!: number;

  @Column({ name: 'available_quantity', default: 1 })
  availableQuantity!: number;

  @Column({ name: 'rate_per_day', type: 'decimal', precision: 10, scale: 2 })
  ratePerDay!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ name: 'condition_grade', length: 4, default: 'A' })
  conditionGrade!: string;

  @Column({ length: 32, default: 'available' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
