import { resolve } from "node:path";
import { initConfigTable } from "../../core/config/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openDatabase } from "../../lib/index.ts";

export async function withConfigDb<T>(fn: (db: DatabaseHandle) => T | Promise<T>): Promise<T> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const db = await openDatabase(resolve(workspace, "ghostpaw.db"));
  initConfigTable(db);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
