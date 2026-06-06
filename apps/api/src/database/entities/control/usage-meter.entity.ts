import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { TenantEnvironmentEntity } from './tenant-environment.entity';

@Entity('usage_meters')
export class UsageMeterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @Column({ name: 'environment_id', type: 'uuid' })
  environmentId!: string;

  @ManyToOne(() => TenantEnvironmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'environment_id' })
  environment?: TenantEnvironmentEntity;

  @Column({ length: 64 })
  metric!: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  quantity!: number;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart!: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd!: Date;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt!: Date;
}
