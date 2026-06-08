import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('event_checklist_items')
export class EventChecklistEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', length: 64 })
  eventId!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ length: 64 })
  department!: string;

  @Column({ name: 'is_done', default: false })
  isDone!: boolean;

  @Column({ name: 'assigned_to', length: 128, nullable: true })
  assignedTo?: string;
}
