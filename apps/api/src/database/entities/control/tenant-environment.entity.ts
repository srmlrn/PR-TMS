import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEnvironment } from '@tms/types';
import { TenantEntity } from './tenant.entity';

@Entity('tenant_environments')
@Unique(['tenantId', 'env'])
export class TenantEnvironmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.environments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @Column({ type: 'enum', enum: TenantEnvironment })
  env!: TenantEnvironment;

  @Column({
    type: 'enum',
    enum: ['pending', 'provisioning', 'active', 'suspended', 'decommissioned'],
    default: 'pending',
  })
  status!: 'pending' | 'provisioning' | 'active' | 'suspended' | 'decommissioned';

  @Column({ name: 'db_name', length: 128 })
  dbName!: string;

  @Column({ name: 'db_host', length: 255, default: 'localhost' })
  dbHost!: string;

  @Column({ name: 'db_port', default: 5432 })
  dbPort!: number;

  @Column({
    name: 'isolation_tier',
    type: 'enum',
    enum: ['shared_pool', 'standard', 'dedicated'],
    default: 'shared_pool',
  })
  isolationTier!: 'shared_pool' | 'standard' | 'dedicated';

  @Column({ length: 32, default: 'us-west1' })
  region!: string;

  @Column({ length: 255, nullable: true })
  subdomain?: string;

  @Column({ name: 'feature_flags', type: 'jsonb', default: {} })
  featureFlags!: Record<string, boolean>;

  @Column({ name: 'resource_tier', type: 'jsonb', default: { cpu: '500m', memory: '512Mi', storageGb: 5 } })
  resourceTier!: { cpu: string; memory: string; storageGb: number };

  @Column({ name: 'provisioned_at', type: 'timestamptz', nullable: true })
  provisionedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
