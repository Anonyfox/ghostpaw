import type { DatabaseHandle } from "./database_handle.ts";
import { loadSqlite } from "./load_sqlite.ts";
import { wrapDatabase } from "./wrap_database.ts";

export async function openTestDatabase(): Promise<DatabaseHandle> {
  const mod = await loadSqlite();
  const db = new mod.DatabaseSync(":memory:");

  db.exec("PRAGMA foreign_keys = ON");

  return wrapDatabase(db);
}
