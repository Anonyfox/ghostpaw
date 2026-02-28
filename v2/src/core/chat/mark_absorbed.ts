import type { DatabaseHandle } from "../../lib/index.ts";

export function markAbsorbed(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE sessions SET absorbed_at = ? WHERE id = ? AND absorbed_at IS NULL").run(
    Date.now(),
    id,
  );
}
