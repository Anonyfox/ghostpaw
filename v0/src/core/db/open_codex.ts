import { createRequire } from "node:module";
import { join } from "node:path";
import type { CodexDb } from "@ghostpaw/codex";
import { initCodexTables } from "@ghostpaw/codex";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { loadSqlite } from "../../lib/load_sqlite.ts";
import { wrapDatabaseSync } from "./wrap.ts";

// DatabaseHandle is structurally compatible with CodexDb at runtime.
// The generic TRecord on CodexDb's get/all methods creates a nominal
// type mismatch that doesn't affect runtime behavior.
function asCodexDb(handle: DatabaseHandle): CodexDb {
  return handle as unknown as CodexDb;
}

export async function openCodexDatabase(homePath: string): Promise<DatabaseHandle> {
  const { DatabaseSync } = await loadSqlite();
  const dbPath = join(homePath, "codex.db");
  const db = new DatabaseSync(dbPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  const handle = wrapDatabaseSync(db);
  initCodexTables(asCodexDb(handle));
  return handle;
}

export function openMemoryCodexDatabase(): DatabaseHandle {
  const req = createRequire(import.meta.url);
  const { DatabaseSync } = req("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(":memory:");

  db.exec("PRAGMA foreign_keys = ON");

  const handle = wrapDatabaseSync(db);
  initCodexTables(asCodexDb(handle));
  return handle;
}
