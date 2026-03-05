import type { DatabaseHandle } from "../../lib/index.ts";
import type { AddMessageInput, ChatMessage } from "./types.ts";

export function addMessage(db: DatabaseHandle, input: AddMessageInput): ChatMessage {
  const now = Date.now();
  const parentId = input.parentId ?? null;
  const model = input.model ?? null;
  const tokensIn = input.tokensIn ?? 0;
  const tokensOut = input.tokensOut ?? 0;
  const reasoningTokens = input.reasoningTokens ?? 0;
  const cachedTokens = input.cachedTokens ?? 0;
  const costUsd = input.costUsd ?? 0;
  const isCompaction = input.isCompaction ? 1 : 0;
  const toolData = input.toolData ?? null;

  const result = db
    .prepare(
      `INSERT INTO messages
       (session_id, parent_id, role, content, model, tokens_in, tokens_out, reasoning_tokens, cached_tokens, cost_usd, created_at, is_compaction, tool_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.sessionId,
      parentId,
      input.role,
      input.content,
      model,
      tokensIn,
      tokensOut,
      reasoningTokens,
      cachedTokens,
      costUsd,
      now,
      isCompaction,
      toolData,
    );

  const messageId = result.lastInsertRowid;

  db.prepare("UPDATE sessions SET head_message_id = ?, last_active_at = ? WHERE id = ?").run(
    messageId,
    now,
    input.sessionId,
  );

  db.prepare(
    "UPDATE sessions SET distilled_at = NULL WHERE id = ? AND distilled_at IS NOT NULL",
  ).run(input.sessionId);

  return {
    id: messageId,
    sessionId: input.sessionId,
    parentId,
    role: input.role,
    content: input.content,
    model,
    tokensIn,
    tokensOut,
    reasoningTokens,
    cachedTokens,
    costUsd,
    createdAt: now,
    isCompaction: !!input.isCompaction,
    toolData,
  };
}
