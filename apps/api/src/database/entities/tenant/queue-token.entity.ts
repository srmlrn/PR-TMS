import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('queue_tokens')
export class QueueTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 16 })
  token!: string;

  @Column({ name: 'devotee_id', type: 'uuid', nullable: true })
  devoteeId?: string;

  @Column({ name: 'devotee_name', length: 128, nullable: true })
  devoteeName?: string;

  @Column({ default: 0 })
  position!: number;

  @Column({ name: 'estimated_wait_minutes', default: 0 })
  estimatedWaitMinutes!: number;

  @Column({ length: 32, default: 'waiting' })
  status!: string;

  @Column({ name: 'queue_type', length: 16, default: 'darshan' })
  queueType!: string;

  @Column({ default: false })
  priority!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
