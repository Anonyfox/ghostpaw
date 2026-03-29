import { createRequire } from "node:module";
import { join } from "node:path";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { loadSqlite } from "../../lib/load_sqlite.ts";
import { wrapDatabaseSync } from "./wrap.ts";

export async function openSubsystemDb(
  homePath: string,
  filename: string,
  initTables: (db: DatabaseHandle) => void,
): Promise<DatabaseHandle> {
  const { DatabaseSync } = await loadSqlite();
  const db = new DatabaseSync(join(homePath, filename));

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  const handle = wrapDatabaseSync(db);
  initTables(handle);
  return handle;
}

export function openMemorySubsystemDb(initTables: (db: DatabaseHandle) => void): DatabaseHandle {
  const req = createRequire(import.meta.url);
  const { DatabaseSync } = req("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(":memory:");

  db.exec("PRAGMA foreign_keys = ON");

  const handle = wrapDatabaseSync(db);
  initTables(handle);
  return handle;
}
