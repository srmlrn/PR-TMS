/** Toggle front desk modules — flip to true when ready to ship. */
export const FRONTDESK_FEATURES = {
  queueManager: false,
  displayBoard: false,
} as const;

export type FrontDeskFeature = keyof typeof FRONTDESK_FEATURES;

export function isFrontDeskFeatureEnabled(feature: FrontDeskFeature): boolean {
  return FRONTDESK_FEATURES[feature];
}

const NAV_FEATURE_BY_ID: Partial<Record<string, FrontDeskFeature>> = {
  'fd-queue': 'queueManager',
  'fd-display': 'displayBoard',
};

export function filterFrontDeskNav<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => {
    const feature = NAV_FEATURE_BY_ID[item.id];
    return feature ? isFrontDeskFeatureEnabled(feature) : true;
  });
}
