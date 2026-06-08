import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('committee_messages')
export class CommitteeMessageEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'committee_id', length: 64 })
  committeeId!: string;

  @Column({ name: 'author_user_id', length: 128 })
  authorUserId!: string;

  @Column({ name: 'author_name', length: 128, nullable: true })
  authorName?: string;

  @Column({ length: 256, nullable: true })
  subject?: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'is_announcement', default: false })
  isAnnouncement!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
