import type { DatabaseHandle } from "../../lib/index.ts";

export function closeSession(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ? AND closed_at IS NULL").run(
    Date.now(),
    id,
  );
}
