import { resolve } from "node:path";
import {
  initChatTables,
  migrateHauntsToSessions,
  recoverOrphanedSessions,
} from "../../core/chat/index.ts";
import { initConfigTable } from "../../core/config/index.ts";
import { initHowlTables } from "../../core/howl/index.ts";
import { initMemoryTable } from "../../core/memory/index.ts";
import { initPackTables } from "../../core/pack/index.ts";
import { initQuestTables } from "../../core/quests/index.ts";
import { initScheduleTables } from "../../core/schedule/index.ts";
import {
  initSecretsTable,
  loadSecretsIntoEnv,
  syncProviderKeys,
} from "../../core/secrets/index.ts";
import {
  ensureMandatorySouls,
  initSoulShardTables,
  initSoulsTables,
} from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openDatabase } from "../../lib/index.ts";

export async function withRunDb<T>(fn: (db: DatabaseHandle) => T | Promise<T>): Promise<T> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const db = await openDatabase(resolve(workspace, "ghostpaw.db"));
  initSecretsTable(db);
  initConfigTable(db);
  initChatTables(db);
  migrateHauntsToSessions(db);
  initMemoryTable(db);
  initSoulsTables(db);
  initSoulShardTables(db);
  initPackTables(db);
  initHowlTables(db);
  initQuestTables(db);
  initScheduleTables(db);
  recoverOrphanedSessions(db);
  ensureMandatorySouls(db);
  loadSecretsIntoEnv(db);
  syncProviderKeys(db);
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}
