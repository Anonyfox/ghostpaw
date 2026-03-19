import { topBeliefs } from "../core/memory/api/read/index.ts";
import { getPackUser } from "../core/pack/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export interface WarmthBelief {
  claim: string;
  category: string;
}

export interface WarmthData {
  userName: string;
  userBond: string | null;
  beliefs: WarmthBelief[];
}

export function getWarmth(db: DatabaseHandle): WarmthData | null {
  let userName: string | null = null;
  let userBond: string | null = null;
  let beliefs: WarmthBelief[] = [];

  try {
    const user = getPackUser(db);
    if (user) {
      userName = user.name;
      userBond = user.bond || null;
    }
  } catch {
    /* fail-open: pack tables may not exist yet */
  }

  try {
    beliefs = topBeliefs(db, 5).map((m) => ({ claim: m.claim, category: m.category }));
  } catch {
    /* fail-open: memory tables may not exist yet */
  }

  if (!userName && beliefs.length === 0) return null;

  return { userName: userName ?? "user", userBond, beliefs };
}
