import type { DatabaseHandle } from "../../lib/index.ts";
import type { AddMessageInput, ChatMessage } from "./types.ts";

export function addMessage(db: DatabaseHandle, input: AddMessageInput): ChatMessage {
  const now = Date.now();
  const parentId = input.parentId ?? null;
  const model = input.model ?? null;
  const tokensIn = input.tokensIn ?? 0;
  const tokensOut = input.tokensOut ?? 0;
  const costUsd = input.costUsd ?? 0;
  const isCompaction = input.isCompaction ? 1 : 0;

  const result = db
    .prepare(
      `INSERT INTO messages (session_id, parent_id, role, content, model, tokens_in, tokens_out, cost_usd, created_at, is_compaction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.sessionId,
      parentId,
      input.role,
      input.content,
      model,
      tokensIn,
      tokensOut,
      costUsd,
      now,
      isCompaction,
    );

  const messageId = result.lastInsertRowid;

  db.prepare("UPDATE sessions SET head_message_id = ?, last_active_at = ? WHERE id = ?").run(
    messageId,
    now,
    input.sessionId,
  );

  return {
    id: messageId,
    sessionId: input.sessionId,
    parentId,
    role: input.role,
    content: input.content,
    model,
    tokensIn,
    tokensOut,
    costUsd,
    createdAt: now,
    isCompaction: !!input.isCompaction,
  };
}
