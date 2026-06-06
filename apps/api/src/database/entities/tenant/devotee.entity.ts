import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Address, ImportantDate } from '@tms/types';

@Entity('devotees')
export class DevoteeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'first_name', length: 128 })
  firstName!: string;

  @Column({ name: 'last_name', length: 128 })
  lastName!: string;

  @Column({ length: 255, nullable: true })
  email?: string;

  @Column({ length: 32 })
  phone!: string;

  @Column({ length: 8 })
  country!: string;

  @Column({ length: 64, nullable: true })
  gotram?: string;

  @Column({ length: 64, nullable: true })
  nakshatra?: string;

  @Column({ length: 64, nullable: true })
  rashi?: string;

  @Column({ length: 16, nullable: true })
  gender?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ name: 'photo_url', length: 512, nullable: true })
  photoUrl?: string;

  @Column({ name: 'family_id', type: 'uuid', nullable: true })
  familyId?: string;

  @Column({ name: 'tax_id', length: 64, nullable: true })
  taxId?: string;

  @Column({ name: 'is_nri', default: false })
  isNri!: boolean;

  @Column({ name: 'communication_opt_in', default: true })
  communicationOptIn!: boolean;

  @Column({ name: 'preferred_language', length: 16, nullable: true })
  preferredLanguage?: string;

  @Column({ name: 'important_dates', type: 'jsonb', nullable: true })
  importantDates?: ImportantDate[];

  @Column({ type: 'jsonb', nullable: true })
  address?: Address;

  @Column({ name: 'membership_tier', length: 32, nullable: true })
  membershipTier?: string;

  @Column({ name: 'membership_expires_at', type: 'timestamptz', nullable: true })
  membershipExpiresAt?: Date;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'renewal_due'], default: 'active' })
  status!: 'active' | 'inactive' | 'renewal_due';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
