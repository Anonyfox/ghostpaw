import type { DatabaseHandle } from "../../lib/database.ts";

export function listSecrets(db: DatabaseHandle): string[] {
  const rows = db.prepare("SELECT key FROM secrets ORDER BY key").all();
  return rows.map((r) => r.key as string);
}
