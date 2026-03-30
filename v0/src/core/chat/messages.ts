import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { MessageRow, MessageSource } from "./types.ts";

export function nextOrdinal(db: DatabaseHandle, sessionId: number): number {
  const row = db
    .prepare("SELECT MAX(ordinal) AS max_ord FROM messages WHERE session_id = ?")
    .get(sessionId);
  const max = (row as { max_ord: number | null } | undefined)?.max_ord;
  return max != null ? max + 1 : 0;
}

export function addMessage(
  db: DatabaseHandle,
  sessionId: number,
  role: "user" | "assistant" | "tool",
  content: string,
  extra?: {
    source?: MessageSource;
    toolCallId?: string;
    parentId?: number;
    isCompaction?: boolean;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    reasoningTokens?: number;
    costUsd?: number;
  },
): number {
  const ordinal = nextOrdinal(db, sessionId);
  const result = db
    .prepare(
      `INSERT INTO messages (session_id, ordinal, role, content, source, tool_call_id,
        parent_id, is_compaction, model,
        input_tokens, output_tokens, cached_tokens, reasoning_tokens, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sessionId,
      ordinal,
      role,
      content,
      extra?.source ?? "organic",
      extra?.toolCallId ?? null,
      extra?.parentId ?? null,
      extra?.isCompaction ? 1 : 0,
      extra?.model ?? null,
      extra?.inputTokens ?? null,
      extra?.outputTokens ?? null,
      extra?.cachedTokens ?? null,
      extra?.reasoningTokens ?? null,
      extra?.costUsd ?? null,
    );
  return Number(result.lastInsertRowid);
}

export function getMessages(db: DatabaseHandle, sessionId: number): MessageRow[] {
  return db
    .prepare("SELECT * FROM messages WHERE session_id = ? ORDER BY ordinal")
    .all(sessionId) as unknown as MessageRow[];
}

export function deleteFromOrdinal(
  db: DatabaseHandle,
  sessionId: number,
  fromOrdinal: number,
): number {
  const result = db
    .prepare("DELETE FROM messages WHERE session_id = ? AND ordinal >= ?")
    .run(sessionId, fromOrdinal);
  return result.changes;
}
