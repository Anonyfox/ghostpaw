import type { DatabaseHandle } from "../../lib/index.ts";

export interface SessionUsageDelta {
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
}

/**
 * Atomically increment session-level token and cost counters.
 * Every LLM call path — turns, oneshots, delegation rollups — must
 * funnel through this single function so no cost is ever lost.
 */
export function accumulateUsage(
  db: DatabaseHandle,
  sessionId: number,
  delta: SessionUsageDelta,
): void {
  db.prepare(
    `UPDATE sessions
     SET tokens_in = tokens_in + ?,
         tokens_out = tokens_out + ?,
         reasoning_tokens = reasoning_tokens + ?,
         cached_tokens = cached_tokens + ?,
         cost_usd = cost_usd + ?
     WHERE id = ?`,
  ).run(
    delta.tokensIn,
    delta.tokensOut,
    delta.reasoningTokens,
    delta.cachedTokens,
    delta.costUsd,
    sessionId,
  );
}
