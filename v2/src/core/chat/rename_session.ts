import type { DatabaseHandle } from "../../lib/index.ts";

export function renameSession(db: DatabaseHandle, id: number, displayName: string): void {
  db.prepare("UPDATE sessions SET display_name = ? WHERE id = ?").run(displayName, id);
}
