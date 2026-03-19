import type { DatabaseHandle } from "../../lib/index.ts";

export function markDistillFailed(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE sessions SET distill_failed_at = ? WHERE id = ?").run(Date.now(), id);
}

export function clearDistillFailed(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE sessions SET distill_failed_at = NULL WHERE id = ?").run(id);
}
