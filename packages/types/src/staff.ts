export type StaffRole = 'priest' | 'frontdesk' | 'volunteer';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  email?: string;
  phone?: string;
  isActive: boolean;
}
