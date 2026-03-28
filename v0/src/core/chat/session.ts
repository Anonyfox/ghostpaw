import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { Session } from "./types.ts";

export function createSession(db: DatabaseHandle, model: string, systemPrompt: string): Session {
  const result = db
    .prepare("INSERT INTO sessions (model, system_prompt) VALUES (?, ?)")
    .run(model, systemPrompt);

  const id = Number(result.lastInsertRowid);
  return getSession(db, id)!;
}

export function getSession(db: DatabaseHandle, id: number): Session | undefined {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  return row ? (row as unknown as Session) : undefined;
}

export function listSessions(db: DatabaseHandle): Session[] {
  return db
    .prepare(
      "SELECT s.*, (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count " +
        "FROM sessions s ORDER BY s.updated_at DESC",
    )
    .all() as unknown as Session[];
}

export function renameSession(db: DatabaseHandle, id: number, title: string): void {
  db.prepare("UPDATE sessions SET title = ? WHERE id = ?").run(title, id);
}

export function updateSessionModel(db: DatabaseHandle, id: number, model: string): void {
  db.prepare("UPDATE sessions SET model = ? WHERE id = ?").run(model, id);
}

export function deleteSession(db: DatabaseHandle, id: number): boolean {
  const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  return result.changes > 0;
}
