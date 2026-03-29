import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { KNOWN_SETTINGS } from "./known.ts";
import { setSetting } from "./set.ts";

export function syncEnvToSettings(db: DatabaseHandle): void {
  for (const [key] of Object.entries(KNOWN_SETTINGS)) {
    const envValue = process.env[key];
    if (!envValue) continue;

    const current = db
      .prepare("SELECT value FROM settings WHERE key = ? AND next_id IS NULL")
      .get(key) as { value: string } | undefined;

    if (current?.value === envValue) continue;

    setSetting(db, key, envValue, { source: "env" });
  }
}
