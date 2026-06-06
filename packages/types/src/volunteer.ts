export interface VolunteerSignup {
  userId: string;
  userName: string;
  signedUpAt: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface VolunteerShift {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
  signups: VolunteerSignup[];
}

export interface CreateVolunteerShiftInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slots: number;
}
