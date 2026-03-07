import type { DatabaseHandle } from "../../lib/index.ts";

export function markMessagesDistilled(db: DatabaseHandle, sessionId: number): number {
  const result = db
    .prepare("UPDATE messages SET distilled = 1 WHERE session_id = ? AND distilled = 0")
    .run(sessionId);
  return result.changes;
}
