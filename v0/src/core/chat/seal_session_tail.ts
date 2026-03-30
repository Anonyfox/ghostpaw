import type { DatabaseHandle } from "../../lib/database_handle.ts";

const SEALABLE_PURPOSES = ["chat", "subsystem_turn", "pulse"] as const;

export function sealSessionTail(db: DatabaseHandle, sessionId: number): number {
  const session = db.prepare("SELECT purpose, soul_id FROM sessions WHERE id = ?").get(sessionId) as
    | { purpose: string; soul_id: number | null }
    | undefined;

  if (!session) return 0;
  if (!(SEALABLE_PURPOSES as readonly string[]).includes(session.purpose)) return 0;
  if (session.soul_id == null) return 0;

  const result = db
    .prepare(
      `UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = (
         SELECT id FROM messages
         WHERE session_id = ? AND sealed_at IS NULL
         ORDER BY ordinal DESC LIMIT 1
       )`,
    )
    .run(sessionId);

  return result.changes;
}
