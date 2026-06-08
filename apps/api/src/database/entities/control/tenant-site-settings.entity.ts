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

@Entity('tenant_site_settings')
export class TenantSiteSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', unique: true })
  tenantId!: string;

  @OneToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: TenantEntity;

  @Column({ length: 255, nullable: true })
  name?: string;

  @Column({ length: 255, nullable: true })
  subtitle?: string;

  @Column({ length: 16, nullable: true })
  icon?: string;

  @Column({ name: 'logo_src', length: 512, nullable: true })
  logoSrc?: string;

  @Column({ name: 'logo_bg', length: 32, nullable: true })
  logoBg?: string;

  @Column({ length: 128, nullable: true })
  deity?: string;

  @Column({ length: 255, nullable: true })
  location?: string;

  @Column({ length: 512, nullable: true })
  address?: string;

  @Column({ name: 'display_announcements', type: 'jsonb', nullable: true })
  displayAnnouncements?: string[];

  @Column({ name: 'open_hour', type: 'smallint', default: 9 })
  openHour!: number;

  @Column({ name: 'close_hour', type: 'smallint', default: 17 })
  closeHour!: number;

  @Column({ name: 'slot_interval_minutes', type: 'smallint', default: 30 })
  slotIntervalMinutes!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
