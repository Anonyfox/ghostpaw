import { resolve } from "node:path";
import { initChatTables } from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import {
  initSecretsTable,
  loadSecretsIntoEnv,
  syncProviderKeys,
} from "../../core/secrets/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openDatabase } from "../../lib/index.ts";

export async function withRunDb<T>(fn: (db: DatabaseHandle) => T | Promise<T>): Promise<T> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const db = await openDatabase(resolve(workspace, "ghostpaw.db"));
  initSecretsTable(db);
  initConfigTable(db);
  initChatTables(db);
  loadSecretsIntoEnv(db);
  syncProviderKeys(db);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
