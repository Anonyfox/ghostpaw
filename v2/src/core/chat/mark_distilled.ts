import type { DatabaseHandle } from "../../lib/index.ts";

export function markDistilled(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE sessions SET distilled_at = ? WHERE id = ? AND distilled_at IS NULL").run(
    Date.now(),
    id,
  );
}
