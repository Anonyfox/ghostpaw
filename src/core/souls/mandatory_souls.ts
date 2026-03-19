export const MANDATORY_SOUL_IDS = {
  ghostpaw: 1,
  mentor: 3,
  trainer: 4,
  warden: 5,
  chamberlain: 6,
  historian: 7,
} as const;

export type MandatorySoulName = keyof typeof MANDATORY_SOUL_IDS;
export type MandatorySoulId = (typeof MANDATORY_SOUL_IDS)[MandatorySoulName];

export const MANDATORY_SOUL_NAMES: MandatorySoulName[] = Object.keys(
  MANDATORY_SOUL_IDS,
) as MandatorySoulName[];
