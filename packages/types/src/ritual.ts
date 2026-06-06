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
