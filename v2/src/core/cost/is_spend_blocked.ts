import type { DatabaseHandle } from "../../lib/index.ts";
import { getSpendInWindow } from "./get_spend_in_window.ts";

const DEFAULT_WINDOW_MS = 86_400_000;

export function isSpendBlocked(
  db: DatabaseHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  if (limitUsd <= 0) return false;
  return getSpendInWindow(db, windowMs) >= limitUsd;
}
