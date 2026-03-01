import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { isMandatorySoulId } from "./mandatory_souls.ts";

export function deleteSoul(db: DatabaseHandle, id: number): void {
  if (isMandatorySoulId(id)) {
    throw new Error(`Cannot archive mandatory soul (ID ${id}).`);
  }
  getActiveSoul(db, id);
  db.prepare("UPDATE souls SET deleted_at = ?, updated_at = ? WHERE id = ?").run(
    Date.now(),
    Date.now(),
    id,
  );
}
