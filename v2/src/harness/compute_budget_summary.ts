import { getConfig } from "../core/config/index.ts";
import { formatBudgetSummary, getSessionTokens, getTokensInWindow } from "../core/cost/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export function computeBudgetSummary(db: DatabaseHandle, sessionId: number): string | null {
  const sessionLimit = (getConfig(db, "max_tokens_per_session") as number | null) ?? 0;
  const dayLimit = (getConfig(db, "max_tokens_per_day") as number | null) ?? 0;
  const warnAt = (getConfig(db, "warn_at_percentage") as number | null) ?? 80;

  if (sessionLimit <= 0 && dayLimit <= 0) return null;

  const sessionTokens = sessionLimit > 0 ? getSessionTokens(db, sessionId) : 0;
  const dayTokens = dayLimit > 0 ? getTokensInWindow(db) : 0;

  return formatBudgetSummary({
    sessionTokens,
    sessionLimit,
    dayTokens,
    dayLimit,
    warnAtPercentage: warnAt,
  });
}
