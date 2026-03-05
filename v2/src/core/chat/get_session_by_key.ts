import type { DatabaseHandle } from "../../lib/index.ts";
import { isNullRow } from "../../lib/index.ts";
import type { ChatSession, SessionPurpose } from "./types.ts";

function rowToSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as number,
    key: row.key as string,
    purpose: (row.purpose as SessionPurpose) ?? "chat",
    model: (row.model as string) ?? null,
    displayName: (row.display_name as string) ?? null,
    createdAt: row.created_at as number,
    lastActiveAt: row.last_active_at as number,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    reasoningTokens: (row.reasoning_tokens as number) ?? 0,
    cachedTokens: (row.cached_tokens as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? 0,
    headMessageId: (row.head_message_id as number) ?? null,
    closedAt: (row.closed_at as number) ?? null,
    distilledAt: (row.distilled_at as number) ?? null,
    parentSessionId: (row.parent_session_id as number) ?? null,
  };
}

export function getSessionByKey(db: DatabaseHandle, key: string): ChatSession | null {
  const row = db
    .prepare(
      "SELECT * FROM sessions WHERE key = ? AND closed_at IS NULL ORDER BY last_active_at DESC LIMIT 1",
    )
    .get(key) as Record<string, unknown> | undefined;
  return isNullRow(row) ? null : rowToSession(row);
}
