import type { DatabaseHandle } from "../../lib/index.ts";

export interface DeleteExchangeResult {
  removedCount: number;
  removedMessageIds: number[];
}

export function deleteLastExchange(db: DatabaseHandle, sessionId: number): DeleteExchangeResult {
  const lastAssistant = db
    .prepare(
      "SELECT id FROM messages WHERE session_id = ? AND role = 'assistant' ORDER BY id DESC LIMIT 1",
    )
    .get(sessionId) as { id: number } | undefined;

  if (!lastAssistant) {
    return { removedCount: 0, removedMessageIds: [] };
  }

  const lastUserBeforeAssistant = db
    .prepare(
      "SELECT id FROM messages WHERE session_id = ? AND role = 'user' AND id < ? ORDER BY id DESC LIMIT 1",
    )
    .get(sessionId, lastAssistant.id) as { id: number } | undefined;

  if (!lastUserBeforeAssistant) {
    return { removedCount: 0, removedMessageIds: [] };
  }

  const rows = db
    .prepare("SELECT id FROM messages WHERE session_id = ? AND id >= ? AND id <= ? ORDER BY id")
    .all(sessionId, lastUserBeforeAssistant.id, lastAssistant.id) as { id: number }[];

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return { removedCount: 0, removedMessageIds: [] };
  }

  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...ids);

  const newHead = db
    .prepare("SELECT id FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 1")
    .get(sessionId) as { id: number } | undefined;

  db.prepare("UPDATE sessions SET head_message_id = ? WHERE id = ?").run(
    newHead?.id ?? null,
    sessionId,
  );

  return { removedCount: ids.length, removedMessageIds: ids };
}
