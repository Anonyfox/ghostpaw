import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface SegmentMessage {
  role: string;
  content: string;
  is_compaction: number;
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
        `SELECT role, content, is_compaction FROM messages
         WHERE session_id = ? AND id > ? AND id <= ? AND role IN ('user', 'assistant')
         ORDER BY ordinal`,
      )
      .all(sessionId, prevBoundary.prev_id, sealedMsgId) as unknown as SegmentMessage[];
  }

  return db
    .prepare(
      `SELECT role, content, is_compaction FROM messages
       WHERE session_id = ? AND id <= ? AND role IN ('user', 'assistant')
       ORDER BY ordinal`,
    )
    .all(sessionId, sealedMsgId) as unknown as SegmentMessage[];
}
