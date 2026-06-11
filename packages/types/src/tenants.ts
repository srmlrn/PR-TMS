export const SV_TEMPLE_ID = '00000000-0000-0000-0000-000000000001';
export const GANESHA_TEMPLE_ID = '00000000-0000-0000-0000-000000000002';

export interface TenantLandingTheme {
  /** Optional full-bleed photo background under /public */
  heroImage?: string;
  /** Optional deity art overlay */
  deityImage?: string;
  /** CSS gradient overlay on top of hero */
  overlay: string;
  /** Accent for glows, borders, highlights */
  accent: string;
  /** Short welcome line on landing */
  welcome: string;
}

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
  /** Immersive landing page visuals */
  landing?: TenantLandingTheme;
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
    landing: {
      /** Deity: Wikimedia Commons Lord-venkateshwara.jpg (CC BY-SA 4.0) */
      deityImage: '/tenants/venkateswara-deity.jpg',
      overlay:
        'linear-gradient(180deg, rgba(6,10,22,0.55) 0%, rgba(8,12,24,0.35) 100%)',
      accent: '#e8b84a',
      welcome: 'Welcome to the abode of Lord Venkateswara',
    },
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
    landing: {
      /** Main sanctum Ganesha from Sri Ganesha Temple Nashville Facebook */
      deityImage: '/tenants/ganesha-deity.jpg',
      overlay:
        'linear-gradient(180deg, rgba(18,4,6,0.55) 0%, rgba(12,3,5,0.35) 100%)',
      accent: '#f0a838',
      welcome: 'Om Gam Ganapataye Namaha · Welcome home',
    },
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

/** Merge DB/admin overrides onto static platform defaults. */
export function mergeTenantBranding(
  base: TenantBranding,
  overrides?: Partial<
    Pick<
      TenantBranding,
      | 'name'
      | 'subtitle'
      | 'icon'
      | 'logoSrc'
      | 'logoBg'
      | 'deity'
      | 'location'
      | 'address'
      | 'displayAnnouncements'
    >
  >,
): TenantBranding {
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...(overrides.name !== undefined && overrides.name !== '' ? { name: overrides.name } : {}),
    ...(overrides.subtitle !== undefined ? { subtitle: overrides.subtitle } : {}),
    ...(overrides.icon !== undefined ? { icon: overrides.icon } : {}),
    ...(overrides.logoSrc !== undefined ? { logoSrc: overrides.logoSrc || undefined } : {}),
    ...(overrides.logoBg !== undefined ? { logoBg: overrides.logoBg || undefined } : {}),
    ...(overrides.deity !== undefined && overrides.deity !== ''
      ? { deity: overrides.deity }
      : {}),
    ...(overrides.location !== undefined ? { location: overrides.location } : {}),
    ...(overrides.address !== undefined ? { address: overrides.address } : {}),
    ...(overrides.displayAnnouncements !== undefined
      ? { displayAnnouncements: overrides.displayAnnouncements }
      : {}),
  };
}

export function getTenantSlug(tenantId: string): string {
  return getTenantBranding(tenantId).slug;
}
