/** Common shrine deities for counter POS and sankalpa. */
export const DEITIES = [
  'Lord Ganesha',
  'Lord Murugan',
  'Goddess Durga',
  'Lord Shiva',
  'Lord Vishnu',
  'Lord Venkateswara',
  'Goddess Lakshmi',
  'Lord Hanuman',
  'Goddess Saraswati',
] as const;

/** Saptarshi and commonly used gotras for sankalpa / devotee profiles. */
export const GOTRAMS = [
  'Agastya',
  'Angirasa',
  'Atri',
  'Bharadwaja',
  'Bhrigu',
  'Garga',
  'Gautama',
  'Harita',
  'Jamadagni',
  'Kashyapa',
  'Katyayana',
  'Kaundinya',
  'Koundinya',
  'Kausika',
  'Kanva',
  'Marichi',
  'Mudgala',
  'Parashara',
  'Pulaha',
  'Pulastya',
  'Shandilya',
  'Shaunaka',
  'Vasishtha',
  'Vatsa',
  'Vishwamitra',
] as const;

/** 27 lunar mansions used for archana and star-day rituals. */
export const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Moola',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
] as const;

export type Gotram = (typeof GOTRAMS)[number];
export type Nakshatra = (typeof NAKSHATRAS)[number];

/** Include a legacy/custom value in a select when it is not in the canonical list. */
export function ritualSelectOptions<T extends string>(
  values: readonly T[],
  current?: string,
): string[] {
  const trimmed = current?.trim();
  if (trimmed && !values.includes(trimmed as T)) {
    return [trimmed, ...values];
  }
  return [...values];
}

/** Deity dropdown: catalog values first, then canonical list, preserving custom entries. */
export function deitySelectOptions(
  services: { deity: string }[],
  current?: string,
): string[] {
  const merged: string[] = [];
  for (const svc of services) {
    const d = svc.deity?.trim();
    if (d && !merged.includes(d)) merged.push(d);
  }
  for (const d of DEITIES) {
    if (!merged.includes(d)) merged.push(d);
  }
  const trimmed = current?.trim();
  if (trimmed && !merged.includes(trimmed)) {
    merged.unshift(trimmed);
  }
  return merged;
}
