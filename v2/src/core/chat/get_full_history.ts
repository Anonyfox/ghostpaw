import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatMessage, MessageRole } from "./types.ts";

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as number,
    sessionId: row.session_id as number,
    parentId: (row.parent_id as number) ?? null,
    role: row.role as MessageRole,
    content: row.content as string,
    model: (row.model as string) ?? null,
    tokensIn: (row.tokens_in as number) ?? 0,
    tokensOut: (row.tokens_out as number) ?? 0,
    reasoningTokens: (row.reasoning_tokens as number) ?? 0,
    cachedTokens: (row.cached_tokens as number) ?? 0,
    costUsd: (row.cost_usd as number) ?? 0,
    createdAt: row.created_at as number,
    isCompaction: row.is_compaction === 1,
    toolData: (row.tool_data as string) ?? null,
    replyToId: (row.reply_to_id as number) ?? null,
  };
}

/**
 * Returns the complete message chain for a session, walking past compaction
 * markers. Used by the UI so users always see the full conversation history.
 * For LLM context (stops at compaction markers), use `getHistory` instead.
 */
export function getFullHistory(db: DatabaseHandle, sessionId: number): ChatMessage[] {
  const session = db.prepare("SELECT head_message_id FROM sessions WHERE id = ?").get(sessionId) as
    | { head_message_id: number | null }
    | undefined;

  if (!session?.head_message_id) return [];

  const rows = db
    .prepare(
      `WITH RECURSIVE chain AS (
         SELECT *, 0 AS depth FROM messages WHERE id = ?
         UNION ALL
         SELECT m.*, c.depth + 1
         FROM messages m JOIN chain c ON m.id = c.parent_id
       )
       SELECT * FROM chain ORDER BY depth DESC`,
    )
    .all(session.head_message_id) as Record<string, unknown>[];

  return rows.map(rowToMessage);
}
