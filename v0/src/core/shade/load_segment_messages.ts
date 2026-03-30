import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface SegmentMessage {
  msg_id: number;
  role: string;
  content: string;
  is_compaction: number;
  tool_call_id: string | null;
}

export interface SegmentToolInfo {
  calledBy: Map<number, string[]>;
  nameOf: Map<string, string>;
}

export function loadSegmentMessages(
  db: DatabaseHandle,
  sessionId: number,
  sealedMsgId: number,
): SegmentMessage[] {
  const prevBoundary = db
    .prepare(
      `SELECT MAX(sealed_msg_id) AS prev_id FROM shade_impressions
       WHERE session_id = ? AND sealed_msg_id < ?`,
    )
    .get(sessionId, sealedMsgId) as { prev_id: number | null };

  if (prevBoundary?.prev_id != null) {
    return db
      .prepare(
        `SELECT id AS msg_id, role, content, is_compaction, tool_call_id FROM messages
         WHERE session_id = ? AND id > ? AND id <= ?
           AND role IN ('user', 'assistant', 'tool')
         ORDER BY ordinal`,
      )
      .all(sessionId, prevBoundary.prev_id, sealedMsgId) as unknown as SegmentMessage[];
  }

  return db
    .prepare(
      `SELECT id AS msg_id, role, content, is_compaction, tool_call_id FROM messages
       WHERE session_id = ? AND id <= ?
         AND role IN ('user', 'assistant', 'tool')
       ORDER BY ordinal`,
    )
    .all(sessionId, sealedMsgId) as unknown as SegmentMessage[];
}

export function loadSegmentToolInfo(
  db: DatabaseHandle,
  messages: SegmentMessage[],
): SegmentToolInfo {
  const calledBy = new Map<number, string[]>();
  const nameOf = new Map<string, string>();

  const assistantIds = messages.filter((m) => m.role === "assistant").map((m) => m.msg_id);
  if (assistantIds.length === 0) return { calledBy, nameOf };

  const placeholders = assistantIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT message_id, id AS call_id, name FROM tool_calls
       WHERE message_id IN (${placeholders})
       ORDER BY message_id, rowid`,
    )
    .all(...assistantIds) as unknown as Array<{
    message_id: number;
    call_id: string;
    name: string;
  }>;

  for (const row of rows) {
    const existing = calledBy.get(row.message_id);
    if (existing) {
      existing.push(row.name);
    } else {
      calledBy.set(row.message_id, [row.name]);
    }
    nameOf.set(row.call_id, row.name);
  }

  return { calledBy, nameOf };
}
