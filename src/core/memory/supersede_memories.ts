import type { DatabaseHandle } from "../../lib/index.ts";

/**
 * Mark one or more memories as superseded. When `replacedById` is provided,
 * that ID is stored as the successor. When omitted, each memory is
 * self-referenced (superseded_by = own id) as a "forgotten" sentinel,
 * satisfying the FK constraint without needing a replacement row.
 */
export function supersedeMemories(db: DatabaseHandle, ids: number[], replacedById?: number): void {
  if (ids.length === 0) return;

  if (replacedById !== undefined && ids.includes(replacedById)) {
    throw new Error(`Replacement memory #${replacedById} cannot also be in the superseded set`);
  }

  db.exec("BEGIN");
  try {
    const check = db.prepare("SELECT id, superseded_by FROM memories WHERE id = ?");
    const update = db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?");

    for (const id of ids) {
      const row = check.get(id) as Record<string, unknown> | undefined;
      if (!row) {
        throw new Error(`Memory #${id} not found`);
      }
      if (row.superseded_by !== null) {
        throw new Error(`Memory #${id} is already superseded`);
      }
      update.run(replacedById ?? id, id);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
