import type { DatabaseHandle } from "../../lib/index.ts";
import type { CostSummary } from "./cost_types.ts";

export function getCostSummary(db: DatabaseHandle, sinceMs: number): CostSummary {
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(cost_usd), 0) AS costUsd,
        COALESCE(SUM(tokens_in), 0) AS tokensIn,
        COALESCE(SUM(tokens_out), 0) AS tokensOut,
        COALESCE(SUM(reasoning_tokens), 0) AS reasoningTokens,
        COALESCE(SUM(cached_tokens), 0) AS cachedTokens,
        COUNT(*) AS sessionCount
      FROM sessions WHERE last_active_at >= ? AND cost_usd > 0`,
    )
    .get(sinceMs) as unknown as CostSummary;
  return row;
}
