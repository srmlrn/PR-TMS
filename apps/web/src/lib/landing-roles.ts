import { UserRole } from '@tms/types';
import type { AppRole } from './roles';
import { GANESHA_TEMPLE_ID, SV_TEMPLE_ID } from './tenant-selection';

export interface LandingRoleCard {
  role: AppRole;
  emoji: string;
  title: string;
  loginEmail: string;
}

export const LANDING_ROLE_ORDER: AppRole[] = [
  UserRole.DEVOTEE,
  UserRole.VOLUNTEER,
  UserRole.FRONT_DESK,
  UserRole.ADMIN,
  UserRole.PRIEST,
  UserRole.ACCOUNTANT,
  'kiosk',
  UserRole.SUPER_ADMIN,
];

const SV_ROLES: LandingRoleCard[] = [
  { role: UserRole.DEVOTEE, emoji: '🙏', title: 'Devotee', loginEmail: 'rajan@ex.com' },
  { role: UserRole.VOLUNTEER, emoji: '🤝', title: 'Volunteer', loginEmail: 'volunteer@svtemple.org' },
  { role: UserRole.FRONT_DESK, emoji: '🖥️', title: 'Front Desk', loginEmail: 'frontdesk@svtemple.org' },
  { role: UserRole.ADMIN, emoji: '📊', title: 'Admin', loginEmail: 'admin@svtemple.org' },
  { role: UserRole.PRIEST, emoji: '📿', title: 'Priest', loginEmail: 'priest@svtemple.org' },
  { role: UserRole.ACCOUNTANT, emoji: '🧾', title: 'Accountant', loginEmail: 'finance@svtemple.org' },
  { role: 'kiosk', emoji: '🏧', title: 'Kiosk', loginEmail: 'frontdesk@svtemple.org' },
  { role: UserRole.SUPER_ADMIN, emoji: '⚙️', title: 'Platform', loginEmail: 'platform@tms.dev' },
];

const GANESHA_ROLES: LandingRoleCard[] = [
  { role: UserRole.DEVOTEE, emoji: '🙏', title: 'Devotee', loginEmail: 'amit@ex.com' },
  { role: UserRole.VOLUNTEER, emoji: '🤝', title: 'Volunteer', loginEmail: 'volunteer@sgtemple.org' },
  { role: UserRole.FRONT_DESK, emoji: '🖥️', title: 'Front Desk', loginEmail: 'frontdesk@sgtemple.org' },
  { role: UserRole.ADMIN, emoji: '📊', title: 'Admin', loginEmail: 'admin@sgtemple.org' },
  { role: UserRole.PRIEST, emoji: '📿', title: 'Priest', loginEmail: 'priest@sgtemple.org' },
  { role: UserRole.ACCOUNTANT, emoji: '🧾', title: 'Accountant', loginEmail: 'finance@sgtemple.org' },
  { role: 'kiosk', emoji: '🏧', title: 'Kiosk', loginEmail: 'frontdesk@sgtemple.org' },
  { role: UserRole.SUPER_ADMIN, emoji: '⚙️', title: 'Platform', loginEmail: 'platform@tms.dev' },
];

export function getLandingRoles(tenantId: string): LandingRoleCard[] {
  return tenantId === GANESHA_TEMPLE_ID ? GANESHA_ROLES : SV_ROLES;
}

export { SV_TEMPLE_ID };
