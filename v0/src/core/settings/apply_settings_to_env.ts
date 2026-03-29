import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { registerSecretKey } from "./scrub.ts";

export function applySettingsToEnv(db: DatabaseHandle): void {
  const rows = db
    .prepare("SELECT key, value, secret FROM settings WHERE next_id IS NULL")
    .all() as { key: string; value: string; secret: number }[];

  const dbKeys = new Set<string>();

  for (const row of rows) {
    process.env[row.key] = row.value;
    dbKeys.add(row.key);
    if (row.secret === 1) {
      registerSecretKey(row.key);
    }
  }

  for (const [key, setting] of Object.entries(KNOWN_SETTINGS)) {
    if (dbKeys.has(key)) continue;
    if (setting.defaultValue !== undefined) {
      process.env[key] = setting.defaultValue;
    }
    if (setting.secret) {
      registerSecretKey(key);
    }
  }
}
