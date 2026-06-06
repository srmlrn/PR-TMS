import { Currency, EventLifecycleStage } from './enums';
import { TenantScoped, Timestamps } from './common';

export interface TempleEvent extends TenantScoped, Timestamps {
  id: string;
  name: string;
  type: 'festival' | 'cultural' | 'community' | 'corporate' | 'wedding' | 'private';
  stage: EventLifecycleStage;
  startDate: Date;
  endDate: Date;
  venues: string[];
  expectedFootfall?: number;
  budgetPlanned?: number;
  revenueTarget?: number;
  clientName?: string;
  clientContact?: string;
  checklistProgress?: { done: number; total: number };
}

export interface EventChecklistItem extends TenantScoped {
  id: string;
  eventId: string;
  title: string;
  department: string;
  isDone: boolean;
  assignedTo?: string;
}

export interface CreateEventInput {
  name: string;
  type: TempleEvent['type'];
  startDate: string;
  endDate: string;
  venues: string[];
  expectedFootfall?: number;
  budgetPlanned?: number;
}
