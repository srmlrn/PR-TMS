import { UserRole } from '@tms/types';
import type { DockNavItem } from '@tms/ui';
import type { EnvBadgeVariant } from '@tms/ui';

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
  { id: 'a-devotees', emoji: '👥', label: 'Devotees', href: '/admin/dashboard' },
  { id: 'a-analytics', emoji: '🔥', label: 'Analytics & Heatmap', href: '/admin/dashboard' },
  { id: 'events', emoji: '🎪', label: 'Event Management', href: '/admin/events' },
  { id: 'rentals', emoji: '🏛️', label: 'Venue & Equipment Rentals', href: '/admin/rentals' },
  { id: 'prasadam', emoji: '🍬', label: 'Prasadam Sponsorship', href: '/admin/prasadam' },
  { id: 'sponsors', emoji: '🤝', label: 'Sponsor Management', href: '/admin/sponsors' },
  { id: 'a-festivals', emoji: '🎉', label: 'Festival Planner', href: '/admin/dashboard' },
  { id: 'a-calendar', emoji: '📅', label: 'Panchang Calendar', href: '/admin/dashboard' },
  { id: 'a-settings', emoji: '⚙️', label: 'Settings & Envs', href: '/admin/settings' },
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
      { id: 'd-book', emoji: '🙏', label: 'Book Seva', href: '/devotee/home' },
      { id: 'd-donate', emoji: '💝', label: 'Donate', href: '/devotee/home' },
      { id: 'd-receipts', emoji: '📄', label: 'Receipts & Tax Docs', href: '/devotee/home' },
      { id: 'd-live', emoji: '📺', label: 'Live Darshan', href: '/devotee/home' },
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
    defaultHref: '/admin/dashboard',
    nav: [{ id: 'fd', emoji: '🖥️', label: 'Reception Console', href: '/admin/dashboard' }],
  },
  [UserRole.PRIEST]: {
    key: UserRole.PRIEST,
    label: 'Priest',
    avatarInitials: 'SR',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/admin/dashboard',
    nav: [{ id: 'priest', emoji: '📿', label: "Today's Schedule", href: '/admin/dashboard' }],
  },
  [UserRole.ACCOUNTANT]: {
    key: UserRole.ACCOUNTANT,
    label: 'Accountant',
    avatarInitials: 'AC',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/admin/dashboard',
    nav: [{ id: 'ac', emoji: '🧾', label: 'Finance Dashboard', href: '/admin/dashboard' }],
  },
  [UserRole.VOLUNTEER]: {
    key: UserRole.VOLUNTEER,
    label: 'Volunteer',
    avatarInitials: 'VP',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/admin/dashboard',
    nav: [{ id: 'vol', emoji: '🤝', label: 'Volunteering', href: '/admin/dashboard' }],
  },
  [UserRole.SUPER_ADMIN]: {
    key: UserRole.SUPER_ADMIN,
    label: 'Platform Admin',
    avatarInitials: 'SA',
    envLabel: 'PROD',
    envVariant: 'prod',
    defaultHref: '/admin/dashboard',
    nav: [{ id: 'sa', emoji: '⚙️', label: 'All Tenants & Billing', href: '/admin/dashboard' }],
  },
  kiosk: {
    key: 'kiosk',
    label: 'Kiosk',
    avatarInitials: 'KI',
    envLabel: 'PROD',
    envVariant: 'prod',
    kiosk: true,
    defaultHref: '/',
    nav: [{ id: 'kiosk', emoji: '🏧', label: 'Kiosk Home', href: '/' }],
  },
};

export interface LandingRoleCard {
  role: AppRole;
  emoji: string;
  title: string;
  description: string;
  href: string;
}

export const LANDING_ROLES: LandingRoleCard[] = [
  {
    role: UserRole.DEVOTEE,
    emoji: '🙏',
    title: 'Devotee / Member',
    description: 'Book sevas, donate, tax docs, live darshan',
    href: '/devotee/home',
  },
  {
    role: UserRole.ADMIN,
    emoji: '📊',
    title: 'Temple Admin',
    description: 'Bento dashboard, devotees, inventory, reports',
    href: '/admin/dashboard',
  },
  {
    role: UserRole.FRONT_DESK,
    emoji: '🖥️',
    title: 'Front Desk',
    description: 'Reception, POS, queue tokens',
    href: '/admin/dashboard',
  },
  {
    role: UserRole.PRIEST,
    emoji: '📿',
    title: 'Priest',
    description: 'Schedule, poojas, honorarium',
    href: '/admin/dashboard',
  },
  {
    role: UserRole.ACCOUNTANT,
    emoji: '🧾',
    title: 'Accountant',
    description: 'Finance, 80G/IRS/CRA, vendors',
    href: '/admin/dashboard',
  },
  {
    role: UserRole.VOLUNTEER,
    emoji: '🤝',
    title: 'Volunteer',
    description: 'Shifts, hours, recognition',
    href: '/admin/dashboard',
  },
  {
    role: UserRole.SUPER_ADMIN,
    emoji: '⚙️',
    title: 'Platform Admin',
    description: 'All tenants, billing, metered usage',
    href: '/admin/dashboard',
  },
  {
    role: 'kiosk',
    emoji: '🏧',
    title: 'Self-Service Kiosk',
    description: 'Touch-first self-service terminal',
    href: '/',
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/devotee/home': 'Home',
  '/admin/dashboard': 'Temple Dashboard',
  '/admin/events': 'Event Management',
  '/admin/rentals': 'Venue & Equipment Rentals',
  '/admin/prasadam': 'Prasadam Sponsorship Program',
  '/admin/sponsors': 'Sponsor Management',
  '/admin/settings': 'Settings & Environments',
};

export function resolveRoleFromPath(pathname: string): AppRole {
  if (pathname.startsWith('/devotee')) return UserRole.DEVOTEE;
  if (pathname.startsWith('/admin')) return UserRole.ADMIN;
  return UserRole.ADMIN;
}

export function getPageTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? 'Temple Management System';
}

export function getRoleConfig(role: AppRole): RoleConfig {
  return ROLE_CONFIGS[role];
}
