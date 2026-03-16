import type { DatabaseHandle } from "../../lib/index.ts";
import { computeSessionXP } from "../../lib/index.ts";
import { parseToolCallData } from "./tool_trace.ts";

export function closeSession(db: DatabaseHandle, id: number, error?: string): void {
  const session = db
    .prepare(
      "SELECT tokens_in, tokens_out, reasoning_tokens, created_at FROM sessions WHERE id = ? AND closed_at IS NULL",
    )
    .get(id) as
    | { tokens_in: number; tokens_out: number; reasoning_tokens: number; created_at: number }
    | undefined;
  if (!session) return;

  const now = Date.now();

  const toolRows = db
    .prepare(
      "SELECT tool_data FROM messages WHERE session_id = ? AND role = 'tool_call' AND tool_data IS NOT NULL",
    )
    .all(id) as { tool_data: string }[];

  const toolNames = new Set<string>();
  for (const row of toolRows) {
    for (const c of parseToolCallData(row.tool_data)) toolNames.add(c.name);
  }

  const xp = computeSessionXP({
    tokensIn: session.tokens_in,
    tokensOut: session.tokens_out,
    reasoningTokens: session.reasoning_tokens,
    uniqueToolCount: toolNames.size,
    durationMs: now - session.created_at,
  });

  db.prepare(
    "UPDATE sessions SET closed_at = ?, error = ?, xp_earned = ? WHERE id = ? AND closed_at IS NULL",
  ).run(now, error ?? null, xp, id);
}
