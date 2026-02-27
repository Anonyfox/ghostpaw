import type { DatabaseHandle } from "../../lib/index.ts";

export function removeMemory(db: DatabaseHandle, id: number): void {
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE memories SET superseded_by = NULL WHERE superseded_by = ?").run(id);
    db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
