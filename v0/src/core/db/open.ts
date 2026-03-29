import { createRequire } from "node:module";
import { join } from "node:path";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { loadSqlite } from "../../lib/load_sqlite.ts";
import { PULSE_SCHEMA_SQL } from "../pulse/schema.ts";
import { SETTINGS_SCHEMA_SQL } from "../settings/schema.ts";
import { SCHEMA_SQL } from "./schema.ts";

export async function openDatabase(homePath: string): Promise<DatabaseHandle> {
  const { DatabaseSync } = await loadSqlite();
  const dbPath = join(homePath, "ghostpaw.db");
  const db = new DatabaseSync(dbPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA_SQL);
  db.exec(PULSE_SCHEMA_SQL);
  db.exec(SETTINGS_SCHEMA_SQL);

  return {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          const result = stmt.run(...params);
          return {
            changes: result.changes as number,
            lastInsertRowid: result.lastInsertRowid as number | bigint,
          };
        },
        get(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          return stmt.get(...params) as Record<string, unknown> | undefined;
        },
        all(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          return stmt.all(...params) as Record<string, unknown>[];
        },
      };
    },
    close() {
      db.close();
    },
  };
}

export function openMemoryDatabase(): DatabaseHandle {
  const req = createRequire(import.meta.url);
  const { DatabaseSync } = req("node:sqlite") as typeof import("node:sqlite");
  const db = new DatabaseSync(":memory:");

  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA_SQL);
  db.exec(PULSE_SCHEMA_SQL);
  db.exec(SETTINGS_SCHEMA_SQL);

  return {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          const result = stmt.run(...params);
          return {
            changes: result.changes as number,
            lastInsertRowid: result.lastInsertRowid as number | bigint,
          };
        },
        get(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          return stmt.get(...params) as Record<string, unknown> | undefined;
        },
        all(...params: unknown[]) {
          // @ts-expect-error — node:sqlite params typing
          return stmt.all(...params) as Record<string, unknown>[];
        },
      };
    },
    close() {
      db.close();
    },
  };
}
