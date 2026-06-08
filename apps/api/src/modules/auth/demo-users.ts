import { GANESHA_TEMPLE_ID, SV_TEMPLE_ID, TenantEnvironment, UserRole } from '@tms/types';

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

/** @deprecated Use SV_TEMPLE_ID from @tms/types */
export const DEMO_TENANT_ID = SV_TEMPLE_ID;

export const DEMO_USERS: DemoUserRecord[] = [
  {
    id: 'user-superadmin-001',
    email: 'platform@tms.dev',
    password: 'demo123',
    name: 'Platform Admin',
    role: UserRole.SUPER_ADMIN,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-admin-001',
    email: 'admin@svtemple.org',
    password: 'demo123',
    name: 'Temple Admin',
    role: UserRole.ADMIN,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-frontdesk-001',
    email: 'frontdesk@svtemple.org',
    password: 'demo123',
    name: 'Reception Staff',
    role: UserRole.FRONT_DESK,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-priest-001',
    email: 'priest@svtemple.org',
    password: 'demo123',
    name: 'Sri Raman',
    role: UserRole.PRIEST,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-accountant-001',
    email: 'finance@svtemple.org',
    password: 'demo123',
    name: 'Finance Lead',
    role: UserRole.ACCOUNTANT,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-volunteer-001',
    email: 'volunteer@svtemple.org',
    password: 'demo123',
    name: 'Volunteer Priya',
    role: UserRole.VOLUNTEER,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-committee-001',
    email: 'committee@svtemple.org',
    password: 'demo123',
    name: 'Committee Member Raj',
    role: UserRole.COMMITTEE,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-devotee-001',
    email: 'rajan@ex.com',
    password: 'demo123',
    name: 'Rajan Krishnamurthy',
    role: UserRole.DEVOTEE,
    tenantId: SV_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
    devoteeEmail: 'rajan@ex.com',
  },
  {
    id: 'user-ganesha-admin-001',
    email: 'admin@sgtemple.org',
    password: 'demo123',
    name: 'HCC Admin',
    role: UserRole.ADMIN,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-frontdesk-001',
    email: 'frontdesk@sgtemple.org',
    password: 'demo123',
    name: 'Reception Desk',
    role: UserRole.FRONT_DESK,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-priest-001',
    email: 'priest@sgtemple.org',
    password: 'demo123',
    name: 'Sri Murugan',
    role: UserRole.PRIEST,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-accountant-001',
    email: 'finance@sgtemple.org',
    password: 'demo123',
    name: 'Finance Office',
    role: UserRole.ACCOUNTANT,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-volunteer-001',
    email: 'volunteer@sgtemple.org',
    password: 'demo123',
    name: 'Volunteer Lakshmi',
    role: UserRole.VOLUNTEER,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-committee-001',
    email: 'committee@sgtemple.org',
    password: 'demo123',
    name: 'Committee Member Priya',
    role: UserRole.COMMITTEE,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
  },
  {
    id: 'user-ganesha-devotee-001',
    email: 'amit@ex.com',
    password: 'demo123',
    name: 'Amit Reddy',
    role: UserRole.DEVOTEE,
    tenantId: GANESHA_TEMPLE_ID,
    environment: TenantEnvironment.PROD,
    devoteeEmail: 'amit@ex.com',
  },
];
