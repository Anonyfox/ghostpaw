import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { rowToLevel } from "./row_to_level.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { Soul } from "./types.ts";

export function revertLevelUp(db: DatabaseHandle, soulId: number): Soul {
  const soul = getActiveSoul(db, soulId);
  if (soul.level < 1) {
    throw new Error(`Soul "${soul.name}" is at level 0 — nothing to revert.`);
  }

  const levelRow = db
    .prepare("SELECT * FROM soul_levels WHERE soul_id = ? ORDER BY level DESC LIMIT 1")
    .get(soulId);
  if (!levelRow) {
    throw new Error(`No level-up record found for soul ID ${soulId}.`);
  }
  const levelRecord = rowToLevel(levelRow as Record<string, unknown>);

  const now = Date.now();

  db.exec("BEGIN");
  try {
    if (levelRecord.traitsConsolidated.length > 0) {
      const ph = levelRecord.traitsConsolidated.map(() => "?").join(", ");
      db.prepare(
        `UPDATE soul_traits SET status = 'active', merged_into = NULL, updated_at = ?
         WHERE id IN (${ph}) AND status = 'consolidated'`,
      ).run(now, ...levelRecord.traitsConsolidated);
    }

    if (levelRecord.traitsPromoted.length > 0) {
      const ph = levelRecord.traitsPromoted.map(() => "?").join(", ");
      db.prepare(
        `UPDATE soul_traits SET status = 'active', updated_at = ? WHERE id IN (${ph}) AND status = 'promoted'`,
      ).run(now, ...levelRecord.traitsPromoted);
    }

    if (levelRecord.traitsCarried.length > 0) {
      const ph = levelRecord.traitsCarried.map(() => "?").join(", ");
      db.prepare(
        `UPDATE soul_traits SET generation = generation - 1, updated_at = ? WHERE id IN (${ph}) AND status = 'active'`,
      ).run(now, ...levelRecord.traitsCarried);
    }

    if (levelRecord.traitsMerged.length > 0) {
      const ph = levelRecord.traitsMerged.map(() => "?").join(", ");
      db.prepare(`UPDATE soul_traits SET merged_into = NULL WHERE merged_into IN (${ph})`).run(
        ...levelRecord.traitsMerged,
      );
      db.prepare(`DELETE FROM soul_traits WHERE id IN (${ph})`).run(...levelRecord.traitsMerged);
    }

    db.prepare("UPDATE souls SET essence = ?, level = level - 1, updated_at = ? WHERE id = ?").run(
      levelRecord.essenceBefore,
      now,
      soulId,
    );

    db.prepare("DELETE FROM soul_levels WHERE id = ?").run(levelRecord.id);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(soulId);
  return rowToSoul(row as Record<string, unknown>);
}
