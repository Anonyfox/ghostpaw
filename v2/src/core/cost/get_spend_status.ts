import type { DatabaseHandle } from "../../lib/index.ts";
import { getSpendInWindow } from "./get_spend_in_window.ts";
import type { SpendStatus } from "./types.ts";

const DEFAULT_WINDOW_MS = 86_400_000;

export function getSpendStatus(
  db: DatabaseHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): SpendStatus {
  const spent = getSpendInWindow(db, windowMs);
  const limit = Math.max(limitUsd, 0);
  const remaining = limit > 0 ? Math.max(limit - spent, 0) : Number.POSITIVE_INFINITY;
  const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
  const isBlocked = limit > 0 && spent >= limit;
  return { spent, limit, remaining, percentage, isBlocked, windowMs };
}
