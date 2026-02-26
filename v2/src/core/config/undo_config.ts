import type { DatabaseHandle } from "../../lib/database.ts";
import { isNullRow } from "../../lib/is_null_row.ts";
import { getCurrentEntry } from "./get_current_entry.ts";

export function undoConfig(db: DatabaseHandle, key: string): boolean {
  const current = getCurrentEntry(db, key);
  if (!current) return false;

  const predecessor = db.prepare("SELECT id FROM config WHERE next_id = ?").get(current.id);

  db.exec("BEGIN");
  try {
    if (!isNullRow(predecessor)) {
      db.prepare("UPDATE config SET next_id = NULL WHERE id = ?").run(predecessor.id as number);
    }

    db.prepare("DELETE FROM config WHERE id = ?").run(current.id);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return true;
}
