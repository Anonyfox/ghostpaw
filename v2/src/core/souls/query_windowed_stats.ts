import type { DatabaseHandle } from "../../lib/index.ts";
import type { DelegationStats } from "./delegation_stats.ts";
import { queryStatsSince } from "./query_stats_since.ts";

export interface WindowedStats {
  window: string;
  stats: DelegationStats;
}

const DAY_MS = 86_400_000;

export function queryWindowedStats(
  db: DatabaseHandle,
  soulId: number,
  lastTraitChangeAt: number | null,
): WindowedStats[] {
  const now = Date.now();
  const windows: WindowedStats[] = [
    { window: "7d", stats: queryStatsSince(db, soulId, now - 7 * DAY_MS) },
    { window: "30d", stats: queryStatsSince(db, soulId, now - 30 * DAY_MS) },
  ];
  if (lastTraitChangeAt !== null) {
    windows.push({
      window: "since_last_trait_change",
      stats: queryStatsSince(db, soulId, lastTraitChangeAt),
    });
  }
  return windows;
}
