import type { DatabaseHandle } from "../../lib/index.ts";

const DEFAULT_WINDOW_MS = 86_400_000;

export function getSpendInWindow(db: DatabaseHandle, windowMs = DEFAULT_WINDOW_MS): number {
  const cutoff = Date.now() - windowMs;
  const row = db
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS total FROM sessions WHERE last_active_at >= ?")
    .get(cutoff) as { total: number } | undefined;
  return row?.total ?? 0;
}
