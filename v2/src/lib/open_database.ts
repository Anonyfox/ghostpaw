import type { DatabaseHandle } from "./database_handle.ts";
import { loadSqlite } from "./load_sqlite.ts";
import { wrapDatabase } from "./wrap_database.ts";

export async function openDatabase(path: string): Promise<DatabaseHandle> {
  const mod = await loadSqlite();
  const db = new mod.DatabaseSync(path);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  return wrapDatabase(db);
}
