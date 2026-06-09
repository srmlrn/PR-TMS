/**
 * Published services from https://ganeshatemple.org/our-services-2/
 * (Pooja Price List, effective June 2024). Used for counter POS quick links and pricing.
 */
export interface GaneshaWebsitePosService {
  /** Catalog / DB names to match (first is preferred quick-link label). */
  matchNames: readonly string[];
  price: number;
  priceOffSite?: number;
}

/** Order shown in counter POS quick links (left column). */
export const GANESHA_WEBSITE_QUICK_LINK_ORDER: readonly string[] = [
  'Archana',
  'Abhishekam ($125)',
  'Aayush Homa',
  'Abhishekam on New Years Day ($101)',
  'Aksharabyasa',
  'Annaprasanam',
  'Bhoomi Pooja',
  'Car Pooja ($75)',
  'Choula',
  'Engagement',
  'Funeral Service',
  'Ganesh Chaturthi Pooja ($501)',
  'Gita Parayan - one day ($31)',
  'Gruhapravesam',
  'Hanuman Chalisa ($21)',
  'Homa',
  'Homa on New Years Day ($51)',
  'Sri Venkateswara Kalyana Utsavam ($201)',
  'Lakshmi Pooja ($31)',
  'Namakarnam',
  'Navagraha Abhishekam on Saturdays',
  'Navagraha Puja',
  'Pahandi ($31)',
  'Ramayan Paat - All Days ($101)',
  'Ratha Yatra - All Day ($201)',
  'Sahasranama ($51)',
  'Sankatahara Chaturthi Homa ($101)',
  'Satyanarayana Pooja',
  'Satyanarayana Pooja on Poornima Day ($51)',
  'Seemantham',
  'Shraddha',
  'Temple Anniversary Pooja (All Days) ($501)',
  'Upanayanam',
  'Varalakshmi Pooja - Other Day',
  'Wedding',
  'Wedding - All Day ($501)',
  '60th Birthday (Shasti Abda Poorthi)',
  'Laksharchana-One day ($31)',
  'Gruhapravesam - All Day ($501)',
  'Satyanarayana Pooja - All Day ($501)',
  'Homa - All Day ($501)',
  'New Born Baby Blessings ($51)',
  'Chalisa ($31)',
  'VIP Darshan',
];

/** At-temple and off-site pricing from the temple website table. */
export const GANESHA_WEBSITE_POS_SERVICES: readonly GaneshaWebsitePosService[] = [
  { matchNames: ['Archana'], price: 15, priceOffSite: 17 },
  { matchNames: ['Abhishekam ($125)', 'Abhishekam'], price: 125, priceOffSite: 125 },
  { matchNames: ['Aayush Homa'], price: 151, priceOffSite: 201 },
  {
    matchNames: [
      'Abhishekam on New Years Day ($101)',
      'Sri Ganesha Abhishekam on New Years Day ($51)',
      'Sri Shiva Abhishekam on New Year\'s Day ($51)',
      'Sri Venkateswara Abhishekam on New Years Day ($51)',
    ],
    price: 101,
    priceOffSite: 101,
  },
  { matchNames: ['Aksharabyasa'], price: 101, priceOffSite: 201 },
  { matchNames: ['Annaprasanam'], price: 101, priceOffSite: 201 },
  { matchNames: ['Bhoomi Pooja'], price: 0, priceOffSite: 201 },
  { matchNames: ['Car Pooja ($75)'], price: 75, priceOffSite: 75 },
  { matchNames: ['Choula'], price: 101, priceOffSite: 201 },
  { matchNames: ['Engagement'], price: 201, priceOffSite: 301 },
  { matchNames: ['Funeral Service'], price: 0, priceOffSite: 201 },
  { matchNames: ['Ganesh Chaturthi Pooja ($501)'], price: 501, priceOffSite: 501 },
  { matchNames: ['Gita Parayan - one day ($31)', 'Gita Parayan - All Day ($101)'], price: 31, priceOffSite: 31 },
  { matchNames: ['Gruhapravesam'], price: 0, priceOffSite: 201 },
  { matchNames: ['Gruhapravesam - All Day ($501)'], price: 501, priceOffSite: 501 },
  { matchNames: ['Hanuman Chalisa ($21)'], price: 31, priceOffSite: 31 },
  { matchNames: ['Homa'], price: 151, priceOffSite: 201 },
  { matchNames: ['Homa on New Years Day ($51)'], price: 101, priceOffSite: 101 },
  { matchNames: ['Homa - All Day ($501)'], price: 501, priceOffSite: 501 },
  {
    matchNames: ['Sri Venkateswara Kalyana Utsavam ($201)', 'Kalyana Utsavam'],
    price: 201,
    priceOffSite: 251,
  },
  { matchNames: ['Lakshmi Pooja ($31)'], price: 31, priceOffSite: 31 },
  { matchNames: ['Namakarnam'], price: 101, priceOffSite: 201 },
  { matchNames: ['Navagraha Abhishekam on Saturdays', 'Navagraha Abhishekam'], price: 51, priceOffSite: 51 },
  { matchNames: ['Navagraha Puja'], price: 101, priceOffSite: 201 },
  { matchNames: ['Pahandi ($31)'], price: 31, priceOffSite: 31 },
  { matchNames: ['Ramayan Paat - All Days ($101)', 'Ramayan Paat - One Day ($31)'], price: 101, priceOffSite: 101 },
  { matchNames: ['Ratha Yatra - All Day ($201)'], price: 201, priceOffSite: 201 },
  { matchNames: ['Sahasranama ($51)'], price: 51, priceOffSite: 51 },
  { matchNames: ['Chalisa ($31)'], price: 31, priceOffSite: 31 },
  { matchNames: ['Sankatahara Chaturthi Homa ($101)'], price: 101, priceOffSite: 101 },
  { matchNames: ['Satyanarayana Pooja'], price: 101, priceOffSite: 201 },
  { matchNames: ['Satyanarayana Pooja on Poornima Day ($51)'], price: 51, priceOffSite: 201 },
  { matchNames: ['Satyanarayana Pooja - All Day ($501)'], price: 501, priceOffSite: 501 },
  { matchNames: ['Seemantham'], price: 151, priceOffSite: 201 },
  { matchNames: ['Shraddha'], price: 101, priceOffSite: 201 },
  { matchNames: ['Temple Anniversary Pooja (All Days) ($501)'], price: 501, priceOffSite: 501 },
  { matchNames: ['Upanayanam'], price: 151, priceOffSite: 201 },
  { matchNames: ['Varalakshmi Pooja - Other Day'], price: 51, priceOffSite: 201 },
  { matchNames: ['Wedding'], price: 351, priceOffSite: 501 },
  { matchNames: ['Wedding - All Day ($501)'], price: 501, priceOffSite: 501 },
  { matchNames: ['60th Birthday (Shasti Abda Poorthi)'], price: 151, priceOffSite: 201 },
  { matchNames: ['Laksharchana-One day ($31)', 'Laksharchana-45 days ($501)'], price: 51, priceOffSite: 501 },
  { matchNames: ['New Born Baby Blessings ($51)'], price: 51, priceOffSite: 51 },
  { matchNames: ['VIP Darshan'], price: 51 },
];

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function websiteServiceMatchesName(serviceName: string, matchName: string): boolean {
  const s = normalizeName(serviceName);
  const m = normalizeName(matchName);
  if (s === m) return true;
  const mBase = m.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim();
  return s === mBase || s.startsWith(`${mBase} `) || s.startsWith(`${mBase}(`);
}

export function findWebsitePosService(serviceName: string): GaneshaWebsitePosService | undefined {
  return GANESHA_WEBSITE_POS_SERVICES.find((row) =>
    row.matchNames.some((name) => websiteServiceMatchesName(serviceName, name)),
  );
}

export function applyWebsitePosPricing<T extends { name: string; price: number; priceOffSite?: number }>(
  row: T,
): T {
  const website = findWebsitePosService(row.name);
  if (!website) return row;
  return {
    ...row,
    price: website.price,
    ...(website.priceOffSite !== undefined ? { priceOffSite: website.priceOffSite } : {}),
  };
}
