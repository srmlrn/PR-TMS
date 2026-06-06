import { TenantEnvironment, UserRole } from '@tms/types';

export interface DemoUserRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  tenantId: string;
  environment: TenantEnvironment;
  devoteeEmail?: string;
}

export const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const DEMO_USERS: DemoUserRecord[] = [
  {
    id: 'user-superadmin-001',
    email: 'platform@tms.dev',
    password: 'demo123',
    name: 'Platform Admin',
    role: UserRole.SUPER_ADMIN,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-admin-001',
    email: 'admin@svtemple.org',
    password: 'demo123',
    name: 'Temple Admin',
    role: UserRole.ADMIN,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-frontdesk-001',
    email: 'frontdesk@svtemple.org',
    password: 'demo123',
    name: 'Reception Staff',
    role: UserRole.FRONT_DESK,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-priest-001',
    email: 'priest@svtemple.org',
    password: 'demo123',
    name: 'Sri Raman',
    role: UserRole.PRIEST,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-accountant-001',
    email: 'finance@svtemple.org',
    password: 'demo123',
    name: 'Finance Lead',
    role: UserRole.ACCOUNTANT,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-volunteer-001',
    email: 'volunteer@svtemple.org',
    password: 'demo123',
    name: 'Volunteer Priya',
    role: UserRole.VOLUNTEER,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-devotee-001',
    email: 'rajan@ex.com',
    password: 'demo123',
    name: 'Rajan Krishnamurthy',
    role: UserRole.DEVOTEE,
    tenantId: DEMO_TENANT_ID,
    environment: TenantEnvironment.PROD,
    devoteeEmail: 'rajan@ex.com',
  },
];
