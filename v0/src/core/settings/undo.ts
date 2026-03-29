import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { canonicalizeKey } from "./canonicalize.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { registerSecretKey, unregisterSecretKey } from "./scrub.ts";

export function undoSetting(
  db: DatabaseHandle,
  rawKey: string,
): { undone: boolean; previousValue?: string } {
  const key = canonicalizeKey(rawKey);
  const known = KNOWN_SETTINGS[key];

  const head = db
    .prepare("SELECT id, value, secret FROM settings WHERE key = ? AND next_id IS NULL")
    .get(key) as { id: number; value: string; secret: number } | undefined;

  if (!head) return { undone: false };

  const predecessor = db
    .prepare("SELECT id, value, secret FROM settings WHERE key = ? AND next_id = ?")
    .get(key, head.id) as { id: number; value: string; secret: number } | undefined;

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM settings WHERE id = ?").run(head.id);
    if (predecessor) {
      db.prepare("UPDATE settings SET next_id = NULL WHERE id = ?").run(predecessor.id);
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  if (predecessor) {
    process.env[key] = predecessor.value;
    if (predecessor.secret) {
      registerSecretKey(key);
    } else {
      unregisterSecretKey(key);
    }
    return { undone: true, previousValue: predecessor.value };
  }

  if (known?.defaultValue !== undefined) {
    process.env[key] = known.defaultValue;
  } else {
    delete process.env[key];
  }
  if (head.secret === 1 || known?.secret) {
    unregisterSecretKey(key);
  }
  return { undone: true };
}
