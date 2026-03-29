import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { canonicalizeKey } from "./canonicalize.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { unregisterSecretKey } from "./scrub.ts";

export function resetSetting(db: DatabaseHandle, rawKey: string): { deleted: number } {
  const key = canonicalizeKey(rawKey);

  const head = db
    .prepare("SELECT secret FROM settings WHERE key = ? AND next_id IS NULL")
    .get(key) as { secret: number } | undefined;
  const wasSecret = head?.secret === 1;

  const result = db.prepare("DELETE FROM settings WHERE key = ?").run(key);

  const known = KNOWN_SETTINGS[key];
  if (known?.defaultValue !== undefined) {
    process.env[key] = known.defaultValue;
  } else {
    delete process.env[key];
  }
  if (wasSecret || known?.secret) {
    unregisterSecretKey(key);
  }

  return { deleted: result.changes };
}
