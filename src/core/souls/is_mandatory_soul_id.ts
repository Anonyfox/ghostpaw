import { MANDATORY_SOUL_IDS } from "./mandatory_souls.ts";

const MANDATORY_ID_SET = new Set<number>(Object.values(MANDATORY_SOUL_IDS));

export function isMandatorySoulId(id: number): boolean {
  return MANDATORY_ID_SET.has(id);
}
