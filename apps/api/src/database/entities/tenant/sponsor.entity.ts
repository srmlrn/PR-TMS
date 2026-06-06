import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sponsors')
export class SponsorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 32 })
  type!: string;

  @Column({ length: 32 })
  tier!: string;

  @Column({ name: 'pipeline_stage', length: 32 })
  pipelineStage!: string;

  @Column({ name: 'primary_contact', length: 255 })
  primaryContact!: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'committed_amount', type: 'decimal', precision: 12, scale: 2 })
  committedAmount!: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ length: 8, default: 'USD' })
  currency!: string;

  @Column({ name: 'renews_at', type: 'timestamptz', nullable: true })
  renewsAt?: Date;

  @Column({ name: 'relationship_manager', length: 128, nullable: true })
  relationshipManager?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
