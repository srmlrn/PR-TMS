import {
  GANESHA_TEMPLE_ID,
  ganeshaSevaSeedRows,
  type GaneshaSevaSeedInput,
} from '@tms/types';
import type { Repository } from 'typeorm';
import type { SevaServiceEntity } from './entities/tenant/seva-service.entity';

function applyCorePricing(row: GaneshaSevaSeedInput): GaneshaSevaSeedInput {
  if (row.name === 'Archana') {
    return { ...row, price: 25, priceOffSite: 51, durationMinutes: 30 };
  }
  if (row.name === 'Abhishekam ($125)') {
    return { ...row, price: 101, priceOffSite: 151, durationMinutes: 60 };
  }
  if (row.name === 'Homa') {
    return { ...row, price: 251, priceOffSite: 401, durationMinutes: 90 };
  }
  return row;
}

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

export async function seedGaneshaSevaCatalog(
  repo: Repository<SevaServiceEntity>,
  deity = 'Lord Ganesha',
): Promise<SevaServiceEntity[]> {
  const rows = ganeshaSevaSeedRows(deity).map(applyCorePricing);
  const saved = await repo.save(
    rows.map((row) =>
      repo.create({
        name: row.name,
        deity: row.deity,
        description: row.description,
        price: row.price,
        priceOffSite: row.priceOffSite,
        currency: 'USD',
        durationMinutes: row.durationMinutes,
        isActive: true,
      }),
    ),
  );
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
  const rows = ganeshaSevaSeedRows(deity).map(applyCorePricing);
  const missing = rows.filter((row) => !existingNames.has(row.name.trim().toLowerCase()));

  if (missing.length === 0) return 0;

  await repo.save(
    missing.map((row) =>
      repo.create({
        name: row.name,
        deity: row.deity,
        description: row.description,
        price: row.price,
        priceOffSite: row.priceOffSite,
        currency: 'USD',
        durationMinutes: row.durationMinutes,
        isActive: true,
      }),
    ),
  );
  await ensureCounterExtras(repo, deity);

  return missing.length;
}
