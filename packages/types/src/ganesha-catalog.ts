import type { SevaService } from './booking';
import catalogData from './data/ganesha-seva-catalog.json';

export type GaneshaCatalogType =
  | 'seva'
  | 'donation'
  | 'rental'
  | 'membership'
  | 'fee'
  | 'event'
  | 'sales'
  | 'other';

export interface GaneshaCatalogItem {
  id: number;
  name: string;
  priceUsd: number | null;
  type: GaneshaCatalogType;
}

export const GANESHA_SEVA_CATALOG: readonly GaneshaCatalogItem[] =
  catalogData as GaneshaCatalogItem[];

/** Core pujas for counter POS quick links (from SGT reports catalog doc). */
export const GANESHA_POS_QUICK_LINK_NAMES: readonly string[] = [
  'Archana',
  'Abhishekam ($125)',
  'Abhishekam',
  'Satyanarayana Pooja',
  'Satyanarayana Pooja - All Day ($501)',
  'Gruhapravesam - All Day ($501)',
  'Wedding - All Day ($501)',
  'Car Pooja ($75)',
  'Navagraha Puja',
  'Homa - All Day ($501)',
  'Annaprasanam',
  'Namakarnam',
  'Upanayanam',
  'Shraddha',
  'Sri Venkateswara Kalyana Utsavam ($201)',
  'Padi Pooja',
  'Sahasranama ($51)',
  'Chalisa ($31)',
  'New Born Baby Blessings ($51)',
  'VIP Darshan',
];

export function ganeshaCatalogByType(type: GaneshaCatalogType): GaneshaCatalogItem[] {
  return GANESHA_SEVA_CATALOG.filter((item) => item.type === type);
}

export function ganeshaDonationFundNames(): string[] {
  return [
    ...new Set(
      GANESHA_SEVA_CATALOG.filter(
        (item) => item.type === 'donation' || item.type === 'membership',
      ).map((item) => item.name),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function catalogDurationMinutes(name: string): number {
  if (/all day/i.test(name)) return 480;
  if (/homa|abhishekam|wedding|gruhapravesam|kalyanam/i.test(name)) return 90;
  if (/darshan|archana|chalisa|sahasranama/i.test(name)) return 30;
  return 60;
}

export interface GaneshaSevaSeedInput {
  name: string;
  deity: string;
  description?: string;
  price: number;
  priceOffSite?: number;
  durationMinutes: number;
}

/** Map catalog seva rows to seva_services seed payloads. */
export function ganeshaSevaSeedRows(deity = 'Lord Ganesha'): GaneshaSevaSeedInput[] {
  return ganeshaCatalogByType('seva').map((item) => {
    const base = item.priceUsd ?? 0;
    const offSiteDefaults: Record<string, number> = {
      Archana: 51,
      Abhishekam: 151,
      Homam: 401,
    };
    const shortName = item.name.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim();
    const priceOffSite = offSiteDefaults[shortName];

    return {
      name: item.name,
      deity,
      description: `SGT catalog #${item.id} · type: seva${item.priceUsd == null ? ' · variable pricing' : ''}`,
      price: base,
      ...(priceOffSite !== undefined ? { priceOffSite } : {}),
      durationMinutes: catalogDurationMinutes(item.name),
    };
  });
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesQuickLinkName(serviceName: string, quickName: string): boolean {
  const s = normalizeName(serviceName);
  const q = normalizeName(quickName);
  if (s === q) return true;
  const qBase = q.replace(/\s*\(\$[\d,]+\)\s*$/, '').trim();
  return s === qBase || s.startsWith(`${qBase} `) || s.startsWith(`${qBase}(`);
}

/** Pick counter POS quick-link services (prioritize temple core pujas). */
export function pickPosQuickLinkServices(
  services: SevaService[],
  max = 12,
): SevaService[] {
  const picked: SevaService[] = [];
  const used = new Set<string>();

  for (const quickName of GANESHA_POS_QUICK_LINK_NAMES) {
    const match = services.find(
      (s) => !used.has(s.id) && matchesQuickLinkName(s.name, quickName),
    );
    if (match) {
      picked.push(match);
      used.add(match.id);
    }
    if (picked.length >= max) return picked;
  }

  for (const svc of services) {
    if (picked.length >= max) break;
    if (!used.has(svc.id)) {
      picked.push(svc);
      used.add(svc.id);
    }
  }

  return picked;
}

export function ganeshaCatalogSummary(): { type: GaneshaCatalogType; count: number }[] {
  const counts = new Map<GaneshaCatalogType, number>();
  for (const item of GANESHA_SEVA_CATALOG) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}
