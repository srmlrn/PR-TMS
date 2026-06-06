export const SV_TEMPLE_ID = '00000000-0000-0000-0000-000000000001';
export const GANESHA_TEMPLE_ID = '00000000-0000-0000-0000-000000000002';

export interface TenantBranding {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  /** Emoji fallback when no logo image */
  icon: string;
  /** Optional path under /public */
  logoSrc?: string;
  /** Logo bar background (ganeshatemple.org topbar uses #960000) */
  logoBg?: string;
  deity: string;
  location: string;
  /** Street / city line for receipts and headers */
  address?: string;
  country: string;
  baseCurrency: string;
  /** TV display board ticker messages */
  displayAnnouncements?: string[];
}

export const TENANT_BRANDING: Record<string, TenantBranding> = {
  [SV_TEMPLE_ID]: {
    id: SV_TEMPLE_ID,
    slug: 'sv-temple',
    name: 'Sri Venkateswara Temple',
    subtitle: 'Bay Area · Demo workspace',
    icon: '🛕',
    deity: 'Lord Venkateswara',
    location: 'Bay Area, California',
    address: 'Fremont, California',
    country: 'US',
    baseCurrency: 'USD',
    displayAnnouncements: [
      'Please listen for your token number · अपना टोकन सुनें',
      'Proceed to the counter shown when your number is called',
      'Thank you for your patience · धन्यवाद',
    ],
  },
  [GANESHA_TEMPLE_ID]: {
    id: GANESHA_TEMPLE_ID,
    slug: 'sri-ganesha-temple',
    name: 'Sri Ganesha Temple',
    subtitle: 'Hindu Cultural Center of Tennessee',
    icon: '🙏',
    /** Official logo from https://ganeshatemple.org/ (cached locally) */
    logoSrc: '/tenants/sri-ganesha-temple.png',
    logoBg: '#960000',
    deity: 'Lord Ganesha',
    location: 'Nashville, Tennessee',
    address: '527 Old Hickory Blvd, Nashville TN 37209',
    country: 'US',
    baseCurrency: 'USD',
    displayAnnouncements: [
      'Om Gam Ganapataye Namaha · Please listen for your token number',
      'Proceed to the counter shown when your number is called',
      'Thank you for your patience',
    ],
  },
};

export const DEMO_TENANT_IDS = [SV_TEMPLE_ID, GANESHA_TEMPLE_ID] as const;

export function getTenantBranding(tenantIdOrSlug: string): TenantBranding {
  if (TENANT_BRANDING[tenantIdOrSlug]) {
    return TENANT_BRANDING[tenantIdOrSlug];
  }
  const bySlug = Object.values(TENANT_BRANDING).find((t) => t.slug === tenantIdOrSlug);
  return bySlug ?? TENANT_BRANDING[SV_TEMPLE_ID];
}

export function getTenantSlug(tenantId: string): string {
  return getTenantBranding(tenantId).slug;
}
