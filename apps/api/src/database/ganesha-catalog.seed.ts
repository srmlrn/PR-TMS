import {
  applyWebsitePosPricing,
  findWebsitePosService,
  GANESHA_TEMPLE_ID,
  ganeshaSevaSeedRows,
  type GaneshaSevaSeedInput,
} from '@tms/types';
import type { Repository } from 'typeorm';
import type { SevaServiceEntity } from './entities/tenant/seva-service.entity';

async function ensureCounterExtras(
  repo: Repository<SevaServiceEntity>,
  deity: string,
): Promise<void> {
  const existing = await repo.find();
  const names = new Set(existing.map((s) => s.name.toLowerCase()));
  const extras = [
    {
      name: 'VIP Darshan',
      deity,
      description: 'Priority darshan (counter POS quick link)',
      price: 51,
      currency: 'USD',
      durationMinutes: 15,
      isActive: true,
    },
  ];
  const toAdd = extras.filter((e) => !names.has(e.name.toLowerCase()));
  if (toAdd.length > 0) {
    await repo.save(toAdd.map((row) => repo.create(row)));
  }
}

function toEntityRow(row: GaneshaSevaSeedInput) {
  const priced = applyWebsitePosPricing(row);
  return {
    name: priced.name,
    deity: priced.deity,
    description: priced.description,
    price: priced.price,
    priceOffSite: priced.priceOffSite,
    currency: 'USD',
    durationMinutes: priced.durationMinutes,
    isActive: true,
  };
}

export async function seedGaneshaSevaCatalog(
  repo: Repository<SevaServiceEntity>,
  deity = 'Lord Ganesha',
): Promise<SevaServiceEntity[]> {
  const rows = ganeshaSevaSeedRows(deity);
  const saved = await repo.save(rows.map((row) => repo.create(toEntityRow(row))));
  await ensureCounterExtras(repo, deity);
  return saved;
}

/** Upsert missing catalog sevas on existing Ganesha DBs (keeps current rows). */
export async function syncGaneshaSevaCatalogIfNeeded(
  repo: Repository<SevaServiceEntity>,
  tenantId: string,
  deity = 'Lord Ganesha',
): Promise<number> {
  if (tenantId !== GANESHA_TEMPLE_ID) return 0;

  const existing = await repo.find();
  const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));
  const rows = ganeshaSevaSeedRows(deity);
  const missing = rows.filter((row) => !existingNames.has(row.name.trim().toLowerCase()));

  if (missing.length > 0) {
    await repo.save(missing.map((row) => repo.create(toEntityRow(row))));
    await ensureCounterExtras(repo, deity);
  }

  return missing.length;
}

/** Apply published website pricing to existing seva rows (Archana $15, Abhishekam $125, etc.). */
export async function syncGaneshaWebsitePricing(
  repo: Repository<SevaServiceEntity>,
  tenantId: string,
): Promise<number> {
  if (tenantId !== GANESHA_TEMPLE_ID) return 0;

  const existing = await repo.find();
  const toSave: SevaServiceEntity[] = [];

  for (const svc of existing) {
    const website = findWebsitePosService(svc.name);
    if (!website) continue;

    const nextPrice = website.price;
    const nextOffSite = website.priceOffSite;
    const priceChanged = svc.price !== nextPrice;
    const offSiteChanged =
      nextOffSite !== undefined && svc.priceOffSite !== nextOffSite;

    if (priceChanged || offSiteChanged) {
      svc.price = nextPrice;
      if (nextOffSite !== undefined) {
        svc.priceOffSite = nextOffSite;
      }
      toSave.push(svc);
    }
  }

  if (toSave.length > 0) {
    await repo.save(toSave);
  }

  return toSave.length;
}
