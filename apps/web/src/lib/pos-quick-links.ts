import {
  GANESHA_TEMPLE_ID,
  pickPosQuickLinkServices,
  type PosProduct,
  type SevaService,
} from '@tms/types';

export function resolvePosQuickLinkServices(
  tenantId: string | undefined,
  services: SevaService[],
): SevaService[] {
  if (tenantId === GANESHA_TEMPLE_ID) {
    return pickPosQuickLinkServices(services, 14);
  }
  return services.slice(0, 6);
}

export function resolvePosQuickLinkProducts(products: PosProduct[], max = 4): PosProduct[] {
  const priority = ['Coconut', 'Flower garland', 'Incense sticks', 'Laddu (single)'];
  const picked: PosProduct[] = [];
  const used = new Set<string>();

  for (const name of priority) {
    const item = products.find((p) => p.name === name);
    if (item && !used.has(item.id)) {
      picked.push(item);
      used.add(item.id);
    }
  }

  for (const item of products) {
    if (picked.length >= max) break;
    if (!used.has(item.id)) {
      picked.push(item);
      used.add(item.id);
    }
  }

  return picked;
}
