import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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
