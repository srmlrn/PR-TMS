import {
  CommitteeCategory,
  CommitteeMemberRole,
  CommitteeType,
  GANESHA_TEMPLE_ID,
  MeetingCadence,
  SV_TEMPLE_ID,
} from '@tms/types';

export const COMMITTEE_SEED_VERSION = 'v5-task-board';

export interface ParsedMember {
  name: string;
  role: CommitteeMemberRole;
  displayTitle?: string;
}

export interface CommitteeSeedDef {
  slug: string;
  name: string;
  description?: string;
  purpose?: string;
  category: CommitteeCategory;
  committeeType: CommitteeType;
  meetingCadence?: MeetingCadence;
  publicRoster: boolean;
  members: string[];
}

/** Parse "Name - Chair" / "Name - Co-Chair" / plain name into role + displayTitle */
export function parseMember(raw: string): ParsedMember {
  const trimmed = raw.trim();
  const dashIdx = trimmed.lastIndexOf(' - ');
  if (dashIdx === -1) {
    return { name: trimmed, role: 'member' };
  }
  const name = trimmed.slice(0, dashIdx).trim();
  const title = trimmed.slice(dashIdx + 3).trim();
  if (/^co-?chair$/i.test(title)) {
    return { name, role: 'vice_chair', displayTitle: 'Co-Chair' };
  }
  if (/^chair$/i.test(title)) {
    return { name, role: 'chair', displayTitle: 'Chair' };
  }
  if (/^secretary$/i.test(title)) {
    return { name, role: 'secretary', displayTitle: 'Secretary' };
  }
  return { name, role: 'member', displayTitle: title };
}

export function committeeIdFor(tenantId: string, slug: string): string {
  const prefix = tenantId === GANESHA_TEMPLE_ID ? 'ganesha' : tenantId === SV_TEMPLE_ID ? 'sv' : 'tenant';
  return `committee-${prefix}-${slug}`;
}

const GANESHA_COMMITTEES: CommitteeSeedDef[] = [
  {
    slug: 'executive',
    name: 'Executive Committee',
    purpose: 'Temple governance and strategic oversight',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Arul Nayagadurai',
      'S.P.Singh',
      'Chandramouly Srinivasan',
      'Suseela Somarajan - Chair',
      'Naveen Srinivas',
      'Thanigai Muthu',
      'Rakesh Sawarkar',
      'Venkat Reddy',
      'Venkat Reddy',
    ],
  },
  {
    slug: 'priest',
    name: 'Priest Committee',
    purpose: 'Religious services and priest coordination',
    category: 'religious',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Chandramouly Srinivasan - Co-Chair',
      'Naveen Srinivas',
      'Suseela Somarajan',
      'Vedavyasa Biliyar',
      'Jyotheen Karam',
      'Pankaj Srivastava',
      'Suma Srinivas',
      'Venk Mani',
      'Manoj Senapati',
      'Rama Reddy',
      'Thanigai Muthu - Co-Chair',
      'Mohan Reddy',
      'Saraswathi Gowda',
      'Usha Mani',
    ],
  },
  {
    slug: 'education',
    name: 'Education Committee',
    purpose: 'Classes, youth programs, and spiritual education',
    category: 'education',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Anil Somayaji - Chair',
      'Shanmuga Sundaram',
      'Angeli Jain',
      'Kamala Raghunathan',
      'Nishitha Reddy',
    ],
  },
  {
    slug: 'cultural',
    name: 'Cultural Committee',
    purpose: 'Cultural events, performances, and festivals',
    category: 'cultural',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Ashokan Vattakkattil - Chair',
      'Chandramouly Srinivasan',
      'Praveen Sivakumar',
      'Salil Das',
      'Arundati Gowda',
      'Prathiba Sundaresh',
      'Sankar Mahadevan',
      'Venkat Reddy',
      'Krish Ullur',
      'Jyotheen Karam',
    ],
  },
  {
    slug: 'pooja',
    name: 'Pooja Committee',
    purpose: 'Daily and special pooja coordination',
    category: 'religious',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Suma Srinivas - Chair',
      'Usha Mani',
      'Sumedha Somayaji',
      'Saraswathi Gowda',
      'Lata Duseja',
      'Suseela Somarajan',
      'Rama Reddy',
      'Kamala Raghunathan',
      'Shashi Biliyar',
      'Pratibha Sundaresh',
      'Leela Gowda',
      'Malleshwari Parichuri',
      'Mangala Channabassappa',
      'Vedavyasa Biliyar',
      'Sudhir VaiKunth',
      'Alok Nanda',
      'Pushpa Ullur',
    ],
  },
  {
    slug: 'prasadam',
    name: 'Prasadam Committee',
    purpose: 'Prasadam preparation and sponsorship',
    category: 'religious',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Nishitha Reddy - Chair',
      'Suma Srinivas',
      'Saraswathi Gowda',
      'Rama Jaikumar',
      'Suseela Somarajan',
      'Rama Reddy',
      'Monal',
      'Malleshwari Parichuri',
      'Mangala Channabassappa',
      'Padmashri Snbhat',
      'Alok Nanda',
      'Pushpa Ullur',
      'Manoj Senapati',
    ],
  },
  {
    slug: 'community-sewa',
    name: 'Community Sewa Committee (CSC)',
    purpose: 'Community service and seva initiatives',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Radha Kirtane - Chair',
      'Surma Choksi',
      'Naga Rajan',
      'Rita Gupta',
      'Angeli Jain',
    ],
  },
  {
    slug: 'it',
    name: 'IT Committee',
    purpose: 'Technology, website, and systems',
    category: 'operations',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Arul Nayagadurai - Chair',
      'Manohar Gudivada',
      'Rakesh Sawarkar',
      'Chandramouly Srinivasan',
      'Nil Bisoi',
      'Thanigs Muthu',
      'Naveen Srinivas',
      'Naina Gowda',
      'Naga Rajan',
      'Priya Mani',
    ],
  },
  {
    slug: 'campus-maintenance',
    name: 'Campus Maintenance Committee',
    purpose: 'Facilities upkeep and campus improvements',
    category: 'operations',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Pankaj Srivastava - Chair',
      'Venk Mani',
      'Manoj Senapati',
      'CV Dash',
      'Venkat Reddy',
      'Venkat Reddy',
      'Naveen Srinivas',
      'Jyotheen Karam',
      'Babu Krishnasamy',
      'Ashokan Vattakkattil',
      'Rakesh Sawarkar',
      'Thanigs Muthu',
      'Alok Nanda',
      'Chandramouly Srinivasan',
    ],
  },
  {
    slug: 'front-desk',
    name: 'Front Desk Committee',
    purpose: 'Reception operations and devotee experience at desk',
    category: 'operations',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Dr.Suseela Somarajan - Chair',
      'Pankaj Srivastava',
      'Chandramouly Srinivasan',
      'Naveen Srinivas',
      'Thanigs Muthu',
      'Jyotheen Karam',
    ],
  },
  {
    slug: 'devotee-experience',
    name: 'Devotee Experience Committee',
    purpose: 'Enhancing devotee visits and feedback',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: ['Naga Rajan - Chair', 'Radha Babu Reddy', 'Kalai Mugilan'],
  },
  {
    slug: 'community-outreach',
    name: 'Community Outreach',
    purpose: 'External community engagement and partnerships',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: [
      'Priya Mani - Chair',
      'Usha Mani',
      'BV Youth Rep',
      'Mittur Ramaprasad',
    ],
  },
  {
    slug: 'volunteer',
    name: 'Volunteer Committee',
    purpose: 'Volunteer recruitment, scheduling, and recognition',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Dr. CV Dash - Chair',
      'Manoj Senapati',
      'Siddhart Mishra',
      'Himakar Borra',
      'Satish Voona',
      'Sameer Srivastav',
      'Santosh Karupakula',
      'Ashokan Vattakkattil',
      'Rajeev Mehta',
      'Alok Nanda',
      'Sweta Lakeshri',
      'Pradeep Sashidharan',
    ],
  },
  {
    slug: 'audit',
    name: 'Audit Committee',
    purpose: 'Financial and operational audit oversight',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: ['Venk Mani', 'Ramesh Sharma'],
  },
  {
    slug: 'endowment-trust-fund',
    name: 'Endowment Trust Fund Committee',
    purpose: 'Endowment fund stewardship',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: [
      'Naveen Srinivas - Chair',
      'Mohan Reddy',
      'Jayaraman Muthusamy',
      'N Rao Chunduru',
    ],
  },
  {
    slug: 'library',
    name: 'Library Committee',
    purpose: 'Temple library and resource management',
    category: 'education',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: ['Meera Kumar - Chair', 'Sri Mishra'],
  },
  {
    slug: 'nomination',
    name: 'Nomination Committee',
    purpose: 'Committee nominations and elections',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'annual',
    publicRoster: true,
    members: [
      'Chandramouly Srinivasan - Chair',
      'Venkat Reddy',
      'Jyotheen Karam',
    ],
  },
  {
    slug: 'fund-raising',
    name: 'Fund Raising Committee',
    purpose: 'Fundraising campaigns and donor outreach',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: [
      'Sunil Kaza - Chair',
      'Rao Velaga',
      'Naveen Srinivas',
      'Ravinder Reddy Manda',
      'Srinivas Matta',
      'Anil Jain',
      'Prakash Patel',
      'Jyotheen Karam',
      'Dayaker Reddy Mallipeddi',
    ],
  },
  {
    slug: 'pakashastry',
    name: 'Pakashastry',
    purpose: 'Ritual scripture and pakasha services',
    category: 'religious',
    committeeType: 'standing',
    meetingCadence: 'as_needed',
    publicRoster: true,
    members: ['Raghavendra'],
  },
  {
    slug: 'housekeeping',
    name: 'Housekeeping',
    purpose: 'Campus cleanliness and housekeeping staff',
    category: 'operations',
    committeeType: 'staff',
    meetingCadence: 'as_needed',
    publicRoster: true,
    members: ['Kevin'],
  },
  {
    slug: 'front-desk-staff',
    name: 'Front Desk Staff',
    purpose: 'Front desk staff roster',
    category: 'operations',
    committeeType: 'staff',
    meetingCadence: 'as_needed',
    publicRoster: true,
    members: [
      'Swetha Sakkari',
      'Lakshmi Juluri',
      'Prakash Desai',
      'Olga Kryshtal',
    ],
  },
];

const SV_COMMITTEES: CommitteeSeedDef[] = [
  {
    slug: 'governance',
    name: 'Temple Governance Committee',
    purpose: 'Governance, planning, and oversight',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Temple Admin - Chair', 'Committee Member Raj'],
  },
  {
    slug: 'finance',
    name: 'Finance Committee',
    purpose: 'Budget, audits, and financial planning',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Ravi Patel - Chair', 'Lakshmi Iyer', 'David Chen'],
  },
  {
    slug: 'religious-affairs',
    name: 'Religious Affairs Committee',
    purpose: 'Pooja schedules and religious programs',
    category: 'religious',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Priest Swaminathan - Chair', 'Anita Desai', 'Vikram Rao'],
  },
  {
    slug: 'cultural-events',
    name: 'Cultural Events Committee',
    purpose: 'Festivals, concerts, and cultural programming',
    category: 'cultural',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Meera Shah - Chair', 'Arjun Nair', 'Sunita Verma'],
  },
  {
    slug: 'education',
    name: 'Education Committee',
    purpose: 'Classes, bal vihar, and youth education',
    category: 'education',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Kavita Menon - Chair', 'Rajesh Kumar', 'Priya Singh'],
  },
  {
    slug: 'facilities',
    name: 'Facilities Committee',
    purpose: 'Building maintenance and capital projects',
    category: 'operations',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Sanjay Gupta - Chair', 'Tom Wilson', 'Maria Lopez'],
  },
  {
    slug: 'community-outreach',
    name: 'Community Outreach Committee',
    purpose: 'Interfaith and community partnerships',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: ['Neha Reddy - Chair', 'James Park', 'Fatima Ali'],
  },
  {
    slug: 'volunteer-coordination',
    name: 'Volunteer Coordination Committee',
    purpose: 'Volunteer scheduling and recognition',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Asha Patel - Chair', 'Michael Brown', 'Sara Lee'],
  },
  {
    slug: 'fundraising',
    name: 'Fundraising Committee',
    purpose: 'Donor campaigns and capital drives',
    category: 'outreach',
    committeeType: 'standing',
    meetingCadence: 'monthly',
    publicRoster: true,
    members: ['Vikram Desai - Chair', 'Emily Johnson', 'Rahul Mehta'],
  },
  {
    slug: 'audit',
    name: 'Audit Committee',
    purpose: 'Independent financial audit oversight',
    category: 'governance',
    committeeType: 'standing',
    meetingCadence: 'quarterly',
    publicRoster: true,
    members: ['Cynthia Adams', 'Robert Kim'],
  },
];

export const COMMITTEE_CATEGORY_LABELS: Record<CommitteeCategory, string> = {
  governance: 'Governance',
  religious: 'Religious Services',
  cultural: 'Cultural',
  education: 'Education',
  operations: 'Operations',
  outreach: 'Community & Outreach',
  staff: 'Staff',
};

export const COMMITTEE_CATEGORY_ORDER: CommitteeCategory[] = [
  'governance',
  'religious',
  'cultural',
  'education',
  'operations',
  'outreach',
  'staff',
];

export function getCommitteeSeedsForTenant(tenantId: string): CommitteeSeedDef[] {
  if (tenantId === GANESHA_TEMPLE_ID) return GANESHA_COMMITTEES;
  if (tenantId === SV_TEMPLE_ID) return SV_COMMITTEES;
  return [];
}
