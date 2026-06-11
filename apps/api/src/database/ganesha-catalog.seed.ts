import {
  applyWebsitePosPricing,
  findWebsitePosService,
  GANESHA_TEMPLE_ID,
  ganeshaSevaSeedRows,
  type GaneshaSevaSeedInput,
} from '@tms/types';
import type { EntityManager, Repository } from 'typeorm';
import { BookingEntity } from './entities/tenant/booking.entity';
import { SevaSubscriptionEntity } from './entities/tenant/seva-subscription.entity';
import { SevaServiceEntity } from './entities/tenant/seva-service.entity';

/** Advisory lock id for Ganesha seva catalog sync (prevents concurrent duplicate inserts). */
const SEVA_CATALOG_SYNC_LOCK = 0x5347_5443; // 'SGTC'
/** Advisory lock id for seva dedupe / unique-index maintenance. */
const SEVA_DEDUPE_LOCK = 0x5347_5455; // 'SGTU'

function normalizeSevaName(name: string): string {
  return name.trim().toLowerCase();
}

async function ensureCounterExtras(
  repo: Repository<SevaServiceEntity>,
  deity: string,
): Promise<void> {
  const existing = await repo.find();
  const names = new Set(existing.map((s) => normalizeSevaName(s.name)));
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
  const toAdd = extras.filter((e) => !names.has(normalizeSevaName(e.name)));
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

async function ensureSevaNameUniqueIndex(em: EntityManager): Promise<void> {
  await em.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_seva_services_name_unique
    ON seva_services (lower(trim(name)))
  `);
}

/** Remove duplicate seva rows (same name), re-pointing bookings/subscriptions to the kept row. */
export async function dedupeSevaServicesByName(
  repo: Repository<SevaServiceEntity>,
): Promise<number> {
  return repo.manager.transaction(async (em) => {
    await em.query('SELECT pg_advisory_xact_lock($1)', [SEVA_DEDUPE_LOCK]);

    const sevaRepo = em.getRepository(SevaServiceEntity);
    const bookingRepo = em.getRepository(BookingEntity);
    const subRepo = em.getRepository(SevaSubscriptionEntity);

    const all = await sevaRepo.find({ order: { createdAt: 'ASC' } });
    const groups = new Map<string, SevaServiceEntity[]>();
    for (const svc of all) {
      const key = normalizeSevaName(svc.name);
      const list = groups.get(key) ?? [];
      list.push(svc);
      groups.set(key, list);
    }

    const duplicateIds: string[] = [];
    const redirect = new Map<string, string>();

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      const keep = group[0];
      for (let i = 1; i < group.length; i++) {
        redirect.set(group[i].id, keep.id);
        duplicateIds.push(group[i].id);
      }
    }

    if (duplicateIds.length === 0) {
      await ensureSevaNameUniqueIndex(em);
      return 0;
    }

    for (const [fromId, toId] of redirect) {
      await bookingRepo.update({ serviceId: fromId }, { serviceId: toId });
      await subRepo.update({ serviceId: fromId }, { serviceId: toId });
    }

    await sevaRepo.delete(duplicateIds);
    await ensureSevaNameUniqueIndex(em);
    return duplicateIds.length;
  });
}

export async function seedGaneshaSevaCatalog(
  repo: Repository<SevaServiceEntity>,
  deity = 'Lord Ganesha',
): Promise<SevaServiceEntity[]> {
  await syncGaneshaSevaCatalogIfNeeded(repo, GANESHA_TEMPLE_ID, deity);
  await ensureCounterExtras(repo, deity);
  return repo.find({ order: { name: 'ASC' } });
}

/** Upsert missing catalog sevas on existing Ganesha DBs (keeps current rows). */
export async function syncGaneshaSevaCatalogIfNeeded(
  repo: Repository<SevaServiceEntity>,
  tenantId: string,
  deity = 'Lord Ganesha',
): Promise<number> {
  if (tenantId !== GANESHA_TEMPLE_ID) return 0;

  return repo.manager.transaction(async (em) => {
    await em.query('SELECT pg_advisory_xact_lock($1)', [SEVA_CATALOG_SYNC_LOCK]);

    const sevaRepo = em.getRepository(SevaServiceEntity);
    const existing = await sevaRepo.find();
    const existingNames = new Set(existing.map((s) => normalizeSevaName(s.name)));
    const rows = ganeshaSevaSeedRows(deity);
    const missing = rows.filter((row) => !existingNames.has(normalizeSevaName(row.name)));

    if (missing.length === 0) return 0;

    await sevaRepo.save(missing.map((row) => sevaRepo.create(toEntityRow(row))));
    await ensureCounterExtras(sevaRepo, deity);
    return missing.length;
  });
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
