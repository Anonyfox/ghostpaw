import type { DatabaseHandle } from "../../lib/index.ts";

export function closeSession(db: DatabaseHandle, id: number, error?: string): void {
  db.prepare("UPDATE sessions SET closed_at = ?, error = ? WHERE id = ? AND closed_at IS NULL").run(
    Date.now(),
    error ?? null,
    id,
  );
}
