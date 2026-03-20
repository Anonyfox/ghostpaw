import { resolve } from "node:path";
import { initConfigTable } from "../../core/config/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openDatabase } from "../../lib/index.ts";
import { resolveDbPath } from "../../lib/resolve_db_path.ts";

export async function withConfigDb<T>(fn: (db: DatabaseHandle) => T | Promise<T>): Promise<T> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const db = await openDatabase(resolveDbPath(workspace));
  initConfigTable(db);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
