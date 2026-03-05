import type { DatabaseHandle } from "../../lib/index.ts";

export interface RunUsage {
  tokensIn: number;
  tokensOut: number;
  reasoningTokens: number;
  cachedTokens: number;
  costUsd: number;
}

export function recordRunUsage(db: DatabaseHandle, id: number, usage: RunUsage): void {
  db.prepare(
    `UPDATE delegation_runs
     SET tokens_in = ?, tokens_out = ?, reasoning_tokens = ?, cached_tokens = ?, cost_usd = ?
     WHERE id = ?`,
  ).run(
    usage.tokensIn,
    usage.tokensOut,
    usage.reasoningTokens,
    usage.cachedTokens,
    usage.costUsd,
    id,
  );
}
