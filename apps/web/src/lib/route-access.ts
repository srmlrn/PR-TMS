import { UserRole } from '@tms/types';
import type { AppRole } from './roles';

export function roleToAppRole(role: UserRole): AppRole {
  return role;
}

export function getDefaultHrefForRole(role: AppRole): string {
  switch (role) {
    case UserRole.DEVOTEE:
      return '/devotee/home';
    case UserRole.FRONT_DESK:
      return '/frontdesk/console';
    case UserRole.PRIEST:
      return '/priest/schedule';
    case UserRole.ACCOUNTANT:
      return '/accountant/finance';
    case UserRole.VOLUNTEER:
      return '/volunteer/shifts';
    case UserRole.COMMITTEE:
      return '/committee/dashboard';
    case UserRole.SUPER_ADMIN:
      return '/platform/tenants';
    case 'kiosk':
      return '/kiosk';
    case UserRole.ADMIN:
    default:
      return '/admin/dashboard';
  }
}

export function canAccessPath(role: AppRole, pathname: string): boolean {
  if (role === UserRole.SUPER_ADMIN) {
    return true;
  }

  if (role === UserRole.ADMIN) {
    return (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/committee/directory') ||
      pathname.startsWith('/committee/reports')
    );
  }

  if (role === UserRole.DEVOTEE) {
    return pathname.startsWith('/devotee');
  }

  if (role === UserRole.FRONT_DESK) {
    return (
      pathname.startsWith('/frontdesk') ||
      pathname.startsWith('/kiosk') ||
      pathname.startsWith('/devotee')
    );
  }

  if (role === UserRole.PRIEST) {
    return pathname.startsWith('/priest');
  }

  if (role === UserRole.ACCOUNTANT) {
    return pathname.startsWith('/accountant');
  }

  if (role === UserRole.VOLUNTEER) {
    return pathname.startsWith('/volunteer');
  }

  if (role === UserRole.COMMITTEE) {
    return pathname.startsWith('/committee');
  }

  if (role === 'kiosk') {
    return pathname.startsWith('/kiosk');
  }

  return false;
}
