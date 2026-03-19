import type { DatabaseHandle } from "../../lib/index.ts";

export function initSecretsTable(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}
