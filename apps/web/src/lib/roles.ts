import { UserRole } from '@tms/types';
import type { DockNavItem } from '@tms/ui';
import type { EnvBadgeVariant } from '@tms/ui';
import { getDefaultHrefForRole } from './route-access';

export type AppRole = UserRole | 'kiosk';

export interface RoleConfig {
  key: AppRole;
  label: string;
  avatarInitials: string;
  envLabel: string;
  envVariant: EnvBadgeVariant;
  kiosk?: boolean;
  nav: DockNavItem[];
  defaultHref: string;
}

const adminNav: DockNavItem[] = [
  { id: 'a-dash', emoji: '📊', label: 'Dashboard', href: '/admin/dashboard' },
  { id: 'a-devotees', emoji: '👥', label: 'Devotees', href: '/admin/devotees' },
  { id: 'a-people', emoji: '🧑‍💼', label: 'People', href: '/admin/people' },
  { id: 'a-committees', emoji: '🏛️', label: 'Committees', href: '/admin/committees' },
  { id: 'a-ops', emoji: '📡', label: 'Operations', href: '/admin/operations' },
  { id: 'events', emoji: '🎪', label: 'Events', href: '/admin/events' },
  { id: 'prasadam', emoji: '🍬', label: 'Prasadam', href: '/admin/prasadam' },
  { id: 'sponsors', emoji: '🤝', label: 'Sponsors', href: '/admin/sponsors' },
  { id: 'a-settings', emoji: '⚙️', label: 'Settings', href: '/admin/settings' },
];

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  [UserRole.DEVOTEE]: {
    key: UserRole.DEVOTEE,
    label: 'Devotee',
    avatarInitials: 'RK',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/devotee/home',
    nav: [
      { id: 'd-home', emoji: '🏠', label: 'Home', href: '/devotee/home' },
      { id: 'd-book', emoji: '🙏', label: 'Book Seva', href: '/devotee/book' },
      { id: 'd-donate', emoji: '💝', label: 'Donate', href: '/devotee/donate' },
      { id: 'd-profile', emoji: '👤', label: 'My Profile', href: '/devotee/profile' },
    ],
  },
  [UserRole.ADMIN]: {
    key: UserRole.ADMIN,
    label: 'Admin',
    avatarInitials: 'AD',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/admin/dashboard',
    nav: adminNav,
  },
  [UserRole.FRONT_DESK]: {
    key: UserRole.FRONT_DESK,
    label: 'Front Desk',
    avatarInitials: 'FD',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/frontdesk/console',
    nav: [
      { id: 'fd', emoji: '🖥️', label: 'Reception Console', href: '/frontdesk/console' },
      { id: 'fd-devotees', emoji: '👥', label: 'Devotees', href: '/frontdesk/devotees' },
      { id: 'fd-queue', emoji: '🎫', label: 'Queue Manager', href: '/frontdesk/queue' },
      { id: 'fd-display', emoji: '📺', label: 'Display Board', href: '/frontdesk/display' },
      { id: 'kiosk', emoji: '🏧', label: 'Kiosk Mode', href: '/kiosk' },
    ],
  },
  [UserRole.PRIEST]: {
    key: UserRole.PRIEST,
    label: 'Priest',
    avatarInitials: 'SR',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/priest/schedule',
    nav: [{ id: 'priest', emoji: '📿', label: "Today's Schedule", href: '/priest/schedule' }],
  },
  [UserRole.ACCOUNTANT]: {
    key: UserRole.ACCOUNTANT,
    label: 'Accountant',
    avatarInitials: 'AC',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/accountant/finance',
    nav: [{ id: 'ac', emoji: '🧾', label: 'Finance Dashboard', href: '/accountant/finance' }],
  },
  [UserRole.VOLUNTEER]: {
    key: UserRole.VOLUNTEER,
    label: 'Volunteer',
    avatarInitials: 'VP',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/volunteer/shifts',
    nav: [{ id: 'vol', emoji: '🤝', label: 'Volunteering', href: '/volunteer/shifts' }],
  },
  [UserRole.COMMITTEE]: {
    key: UserRole.COMMITTEE,
    label: 'Committee',
    avatarInitials: 'CM',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/committee/dashboard',
    nav: [
      { id: 'cm-dash', emoji: '📊', label: 'Dashboard', href: '/committee/dashboard' },
      { id: 'cm-tasks', emoji: '✅', label: 'My Tasks', href: '/committee/tasks' },
      { id: 'cm-req', emoji: '📋', label: 'Requests', href: '/committee/requests' },
      { id: 'cm-cal', emoji: '📅', label: 'Calendar', href: '/committee/calendar' },
      { id: 'cm-msg', emoji: '💬', label: 'Messages', href: '/committee/messages' },
    ],
  },
  [UserRole.SUPER_ADMIN]: {
    key: UserRole.SUPER_ADMIN,
    label: 'Platform Admin',
    avatarInitials: 'SA',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/platform/tenants',
    nav: [
      { id: 'sa', emoji: '⚙️', label: 'All Tenants', href: '/platform/tenants' },
      { id: 'sa-dash', emoji: '📊', label: 'Temple Admin', href: '/admin/dashboard' },
    ],
  },
  kiosk: {
    key: 'kiosk',
    label: 'Kiosk',
    avatarInitials: 'KI',
    envLabel: 'PROD',
    envVariant: 'prod',
    kiosk: true,
    defaultHref: '/kiosk',
    nav: [{ id: 'kiosk', emoji: '🏧', label: 'Kiosk Home', href: '/kiosk' }],
  },
};

export interface LandingRoleCard {
  role: AppRole;
  emoji: string;
  title: string;
  description: string;
  loginEmail: string;
}

export const LANDING_ROLES: LandingRoleCard[] = [
  {
    role: UserRole.DEVOTEE,
    emoji: '🙏',
    title: 'Devotee / Member',
    description: 'Book sevas, donate, tax docs, live darshan',
    loginEmail: 'rajan@ex.com',
  },
  {
    role: UserRole.ADMIN,
    emoji: '📊',
    title: 'Temple Admin',
    description: 'Bento dashboard, devotees, inventory, reports',
    loginEmail: 'admin@svtemple.org',
  },
  {
    role: UserRole.FRONT_DESK,
    emoji: '🖥️',
    title: 'Front Desk',
    description: 'Reception, POS, queue tokens',
    loginEmail: 'frontdesk@svtemple.org',
  },
  {
    role: UserRole.PRIEST,
    emoji: '📿',
    title: 'Priest',
    description: 'Schedule, poojas, honorarium',
    loginEmail: 'priest@svtemple.org',
  },
  {
    role: UserRole.ACCOUNTANT,
    emoji: '🧾',
    title: 'Accountant',
    description: 'Finance, 80G/IRS/CRA, vendors',
    loginEmail: 'finance@svtemple.org',
  },
  {
    role: UserRole.VOLUNTEER,
    emoji: '🤝',
    title: 'Volunteer',
    description: 'Shifts, hours, recognition',
    loginEmail: 'volunteer@svtemple.org',
  },
  {
    role: UserRole.COMMITTEE,
    emoji: '🏛️',
    title: 'Committee Member',
    description: 'Governance, tasks, approvals, calendar',
    loginEmail: 'committee@svtemple.org',
  },
  {
    role: UserRole.SUPER_ADMIN,
    emoji: '⚙️',
    title: 'Platform Admin',
    description: 'All tenants, billing, metered usage',
    loginEmail: 'platform@tms.dev',
  },
  {
    role: 'kiosk',
    emoji: '🏧',
    title: 'Self-Service Kiosk',
    description: 'Touch-first self-service terminal',
    loginEmail: 'frontdesk@svtemple.org',
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/devotee/home': 'Home',
  '/devotee/book': 'Book Seva',
  '/devotee/donate': 'Donate',
  '/devotee/profile': 'My Profile',
  '/admin/dashboard': 'Dashboard',
  '/admin/devotees': 'Devotee CRM',
  '/admin/people': 'People Management',
  '/admin/people/staff': 'Staff Roster',
  '/admin/people/users': 'Users & Roles',
  '/admin/people/leaves': 'Leave Management',
  '/admin/operations': 'Operations',
  '/admin/committees': 'Committee Management',
  '/admin/reminders': 'Important Date Reminders',
  '/admin/communications': 'Communications',
  '/admin/subscriptions': 'Recurring Subscriptions',
  '/admin/events': 'Event Management',
  '/admin/rentals': 'Venue & Equipment Rentals',
  '/admin/prasadam': 'Prasadam Sponsorship Program',
  '/admin/sponsors': 'Sponsor Management',
  '/admin/settings': 'Settings & Environments',
  '/admin/settings/payments': 'Payment Settings',
  '/admin/settings/branding': 'Branding & Labels',
  '/admin/settings/schedules': 'Schedules & Hours',
  '/admin/settings/catalog/services': 'Seva Catalog',
  '/admin/settings/catalog/products': 'Counter Products',
  '/frontdesk/console': 'Reception Console',
  '/frontdesk/devotees': 'Devotee Management',
  '/frontdesk/queue': 'Queue Manager',
  '/frontdesk/display': 'Display Board',
  '/frontdesk/token-print': 'Darshan Token',
  '/frontdesk/receipt-print': 'Payment Receipt',
  '/priest/schedule': "Today's Schedule",
  '/accountant/finance': 'Finance Dashboard',
  '/volunteer/shifts': 'Volunteering',
  '/committee/dashboard': 'Committee Dashboard',
  '/committee/tasks': 'My Tasks',
  '/committee/requests': 'Requests',
  '/committee/calendar': 'Calendar Blocks',
  '/committee/messages': 'Committee Messages',
  '/platform/tenants': 'Platform Tenants',
  '/kiosk': 'Self-Service Kiosk',
};

export function resolveRoleFromPath(pathname: string): AppRole {
  if (pathname.startsWith('/devotee')) return UserRole.DEVOTEE;
  if (pathname.startsWith('/frontdesk')) return UserRole.FRONT_DESK;
  if (pathname.startsWith('/priest')) return UserRole.PRIEST;
  if (pathname.startsWith('/accountant')) return UserRole.ACCOUNTANT;
  if (pathname.startsWith('/volunteer')) return UserRole.VOLUNTEER;
  if (pathname.startsWith('/committee')) return UserRole.COMMITTEE;
  if (pathname.startsWith('/platform')) return UserRole.SUPER_ADMIN;
  if (pathname.startsWith('/kiosk')) return 'kiosk';
  if (pathname.startsWith('/admin')) return UserRole.ADMIN;
  return UserRole.ADMIN;
}

export function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  const prefixes = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return PAGE_TITLES[prefix];
    }
  }
  return 'Temple Management System';
}

export function getRoleConfig(role: AppRole): RoleConfig {
  return ROLE_CONFIGS[role];
}

export function getRoleConfigForUser(role: AppRole): RoleConfig {
  return {
    ...ROLE_CONFIGS[role],
    defaultHref: getDefaultHrefForRole(role),
  };
}
