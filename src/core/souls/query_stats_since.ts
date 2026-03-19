import type { DatabaseHandle } from "../../lib/index.ts";
import { getDelegationStatsSince } from "../chat/api/read/index.ts";
import type { DelegationStats } from "./delegation_stats.ts";

export function queryStatsSince(
  db: DatabaseHandle,
  soulId: number,
  sinceMs: number,
): DelegationStats {
  return getDelegationStatsSince(db, soulId, sinceMs);
}
