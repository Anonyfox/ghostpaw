import type { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { nextOrdinal } from "./messages.ts";

export interface UsageData {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  costUsd?: number;
}

export function persistTurnMessages(
  db: DatabaseHandle,
  sessionId: number,
  newMessages: Message[],
  usage?: UsageData,
): number {
  let lastMessageId = -1;
  let ordinal = nextOrdinal(db, sessionId);

  db.exec("BEGIN");
  try {
    const insertMsg = db.prepare(
      `INSERT INTO messages (session_id, ordinal, role, content, tool_call_id, model,
        input_tokens, output_tokens, cached_tokens, reasoning_tokens, cost_usd)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertToolCall = db.prepare(
      "INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)",
    );

    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      const isLast = i === newMessages.length - 1;
      const applyUsage = isLast && msg.role === "assistant" && usage;

      const result = insertMsg.run(
        sessionId,
        ordinal++,
        msg.role,
        msg.content ?? "",
        msg.toolCallId ?? null,
        applyUsage ? (usage.model ?? null) : null,
        applyUsage ? (usage.inputTokens ?? null) : null,
        applyUsage ? (usage.outputTokens ?? null) : null,
        applyUsage ? (usage.cachedTokens ?? null) : null,
        applyUsage ? (usage.reasoningTokens ?? null) : null,
        applyUsage ? (usage.costUsd ?? null) : null,
      );

      const messageId = Number(result.lastInsertRowid);
      lastMessageId = messageId;

      if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          insertToolCall.run(tc.id, messageId, tc.name, tc.arguments ?? "{}");
        }
      }
    }

    db.prepare(
      "UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    ).run(sessionId);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return lastMessageId;
}
