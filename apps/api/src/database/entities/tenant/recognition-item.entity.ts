import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('recognition_items')
export class RecognitionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sponsor_id', type: 'uuid' })
  sponsorId!: string;

  @Column({ length: 255 })
  item!: string;

  @Column({ name: 'is_fulfilled', default: false })
  isFulfilled!: boolean;

  @Column({ name: 'fulfilled_at', type: 'timestamptz', nullable: true })
  fulfilledAt?: Date;
}
