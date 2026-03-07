export const MANDATORY_SOUL_IDS = {
  ghostpaw: 1,
  "js-engineer": 2,
  mentor: 3,
  trainer: 4,
  warden: 5,
  chamberlain: 6,
} as const;

export type MandatorySoulName = keyof typeof MANDATORY_SOUL_IDS;
export type MandatorySoulId = (typeof MANDATORY_SOUL_IDS)[MandatorySoulName];

export const MANDATORY_SOUL_NAMES: MandatorySoulName[] = Object.keys(
  MANDATORY_SOUL_IDS,
) as MandatorySoulName[];

export function isMandatorySoulId(id: number): boolean {
  return (Object.values(MANDATORY_SOUL_IDS) as number[]).includes(id);
}
