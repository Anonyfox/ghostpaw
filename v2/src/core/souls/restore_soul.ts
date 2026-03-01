import type { DatabaseHandle } from "../../lib/index.ts";
import { getSoul } from "./get_soul.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { Soul } from "./types.ts";

export function restoreSoul(db: DatabaseHandle, id: number, newName?: string): Soul {
  const soul = getSoul(db, id);
  if (!soul) {
    throw new Error(`Soul with ID ${id} not found.`);
  }
  if (soul.deletedAt == null) {
    throw new Error(`Soul "${soul.name}" (ID ${id}) is not archived.`);
  }

  const targetName = newName != null ? newName.trim() : soul.name;
  if (newName != null && targetName.length === 0) {
    throw new Error("Soul name must not be empty.");
  }

  const conflict = db
    .prepare("SELECT id FROM souls WHERE name = ? AND deleted_at IS NULL AND id != ?")
    .get(targetName, id);
  if (conflict) {
    throw new Error(`Cannot restore: an active soul named "${targetName}" already exists.`);
  }

  const now = Date.now();
  const sets = ["deleted_at = NULL", "updated_at = ?"];
  const params: unknown[] = [now];
  if (newName != null) {
    sets.push("name = ?");
    params.push(targetName);
  }
  params.push(id);

  db.prepare(`UPDATE souls SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(id);
  return rowToSoul(row as Record<string, unknown>);
}
