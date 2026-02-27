import type { DatabaseHandle } from "../../lib/index.ts";

export function deleteConfig(db: DatabaseHandle, key: string): void {
  db.prepare("DELETE FROM config WHERE key = ?").run(key);
}
