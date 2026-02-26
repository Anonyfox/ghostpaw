import type { DatabaseHandle } from "../../lib/database.ts";

export function deleteConfig(db: DatabaseHandle, key: string): void {
  db.prepare("DELETE FROM config WHERE key = ?").run(key);
}
