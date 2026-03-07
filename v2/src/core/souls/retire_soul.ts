import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { isMandatorySoulId } from "./mandatory_souls.ts";

export function retireSoul(db: DatabaseHandle, id: number): void {
  if (isMandatorySoulId(id)) {
    throw new Error(`Cannot retire a core soul (ID ${id}).`);
  }
  getActiveSoul(db, id);
  const now = Date.now();
  db.prepare("UPDATE souls SET deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, id);
}
