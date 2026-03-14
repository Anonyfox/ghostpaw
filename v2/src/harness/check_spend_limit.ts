import { getSpendInWindow } from "../core/chat/api/read/index.ts";
import { getConfig } from "../core/config/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { SpendLimitError } from "../lib/index.ts";

export function checkSpendLimit(db: DatabaseHandle): void {
  const limit = (getConfig(db, "max_cost_per_day") as number | null) ?? 0;
  if (limit <= 0) return;
  const spent = getSpendInWindow(db);
  if (spent >= limit) {
    throw new SpendLimitError(spent, limit);
  }
}
