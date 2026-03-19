import type { DatabaseHandle } from "../../lib/index.ts";

export function countSubstantiveMessages(db: DatabaseHandle, sessionId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM messages
       WHERE session_id = ?
         AND role IN ('user', 'assistant')
         AND is_compaction = 0`,
    )
    .get(sessionId) as { cnt: number };
  return row.cnt;
}
