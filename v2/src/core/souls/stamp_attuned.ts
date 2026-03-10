import type { DatabaseHandle } from "../../lib/index.ts";

export function stampAttuned(db: DatabaseHandle, soulId: number): void {
  db.prepare("UPDATE souls SET last_attuned_at = ? WHERE id = ?").run(
    Math.floor(Date.now() / 1000),
    soulId,
  );
}
