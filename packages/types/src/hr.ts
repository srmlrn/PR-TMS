import type { UserRole } from './enums';
import type { StaffRole } from './staff';

export type StaffLeaveType = 'annual' | 'sick' | 'personal' | 'festival' | 'other';

export type StaffLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffLeave {
  id: string;
  staffId: string;
  staffName?: string;
  type: StaffLeaveType;
  startDate: string;
  endDate: string;
  status: StaffLeaveStatus;
  reason?: string;
  adminNote?: string;
  requestedAt: string;
  reviewedAt?: string;
}

/** Tenant login role — platform super-admin is not assignable per tenant. */
export type TenantUserRole = Exclude<UserRole, UserRole.SUPER_ADMIN>;

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: TenantUserRole;
  staffId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  name: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  notes?: string;
  userId?: string;
}

export interface UpdateStaffInput {
  name?: string;
  role?: StaffRole;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  notes?: string;
  userId?: string | null;
  isActive?: boolean;
}

export interface CreateStaffLeaveInput {
  staffId: string;
  type: StaffLeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateStaffLeaveInput {
  status?: StaffLeaveStatus;
  adminNote?: string;
}

export interface CreateTenantUserInput {
  email: string;
  name: string;
  role: TenantUserRole;
  password: string;
  staffId?: string;
}

export interface UpdateTenantUserInput {
  email?: string;
  name?: string;
  role?: TenantUserRole;
  password?: string;
  staffId?: string | null;
  isActive?: boolean;
}
