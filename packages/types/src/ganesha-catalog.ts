import type { SevaService } from './booking';
import catalogData from './data/ganesha-seva-catalog.json';
import {
  applyWebsitePosPricing,
  GANESHA_WEBSITE_QUICK_LINK_ORDER,
  websiteServiceMatchesName,
} from './ganesha-website-services';

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

/** Counter POS quick links — mirrors ganeshatemple.org/our-services-2/. */
export const GANESHA_POS_QUICK_LINK_NAMES: readonly string[] = GANESHA_WEBSITE_QUICK_LINK_ORDER;

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
    const row: GaneshaSevaSeedInput = {
      name: item.name,
      deity,
      description: `SGT catalog #${item.id} · type: seva${item.priceUsd == null ? ' · variable pricing' : ''}`,
      price: base,
      durationMinutes: catalogDurationMinutes(item.name),
    };
    return applyWebsitePosPricing(row);
  });
}

/** Pick counter POS quick-link services (ganeshatemple.org published list). */
export function pickPosQuickLinkServices(
  services: SevaService[],
  max = GANESHA_POS_QUICK_LINK_NAMES.length,
): SevaService[] {
  const picked: SevaService[] = [];
  const used = new Set<string>();

  for (const quickName of GANESHA_POS_QUICK_LINK_NAMES) {
    const match = services.find(
      (s) => !used.has(s.id) && websiteServiceMatchesName(s.name, quickName),
    );
    if (match) {
      picked.push(match);
      used.add(match.id);
    }
    if (picked.length >= max) return picked;
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
