import type { DatabaseHandle } from "../../lib/index.ts";

export function deleteSession(db: DatabaseHandle, id: number): void {
  db.prepare("DELETE FROM messages WHERE session_id = ?").run(id);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}
