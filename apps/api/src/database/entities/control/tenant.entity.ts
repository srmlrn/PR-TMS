import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantEnvironmentEntity } from './tenant-environment.entity';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 64, unique: true })
  slug!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 8, default: 'US' })
  country!: string;

  @Column({ name: 'base_currency', length: 8, default: 'USD' })
  baseCurrency!: string;

  @Column({ type: 'enum', enum: ['starter', 'standard', 'pro', 'enterprise'], default: 'standard' })
  plan!: 'starter' | 'standard' | 'pro' | 'enterprise';

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => TenantEnvironmentEntity, (env) => env.tenant)
  environments?: TenantEnvironmentEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
