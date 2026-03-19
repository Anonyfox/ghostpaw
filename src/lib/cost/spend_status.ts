import type { SpendStatus } from "./types.ts";

export function computeSpendStatus(spent: number, limitUsd: number, windowMs: number): SpendStatus {
  const limit = Math.max(limitUsd, 0);
  const remaining = limit > 0 ? Math.max(limit - spent, 0) : Number.POSITIVE_INFINITY;
  const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
  const isBlocked = limit > 0 && spent >= limit;
  return { spent, limit, remaining, percentage, isBlocked, windowMs };
}

export function isSpendBlocked(spent: number, limitUsd: number): boolean {
  if (limitUsd <= 0) return false;
  return spent >= limitUsd;
}
