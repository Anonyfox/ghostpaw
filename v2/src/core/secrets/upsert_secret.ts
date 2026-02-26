import type { DatabaseHandle } from "../../lib/database.ts";

export function upsertSecret(db: DatabaseHandle, key: string, value: string): void {
  db.prepare(
    "INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).run(key, value, Date.now());
}
