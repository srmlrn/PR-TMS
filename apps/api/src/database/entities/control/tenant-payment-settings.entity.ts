import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('tenant_payment_settings')
export class TenantPaymentSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', unique: true })
  tenantId!: string;

  @OneToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @Column({ name: 'stripe_enabled', default: false })
  stripeEnabled!: boolean;

  @Column({ name: 'stripe_mode', length: 8, default: 'test' })
  stripeMode!: 'test' | 'live';

  @Column({ name: 'stripe_publishable_key', length: 255, nullable: true })
  stripePublishableKey?: string;

  @Column({ name: 'stripe_secret_key', length: 255, nullable: true })
  stripeSecretKey?: string;

  @Column({ name: 'stripe_webhook_secret', length: 255, nullable: true })
  stripeWebhookSecret?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
