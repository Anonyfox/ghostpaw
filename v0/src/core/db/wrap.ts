import type { DatabaseHandle } from "../../lib/database_handle.ts";

export function wrapDatabaseSync(db: {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown;
  };
  close(): void;
}): DatabaseHandle {
  return {
    exec(sql: string) {
      db.exec(sql);
    },
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        run(...params: unknown[]) {
          const result = stmt.run(...params) as {
            changes: number;
            lastInsertRowid: number | bigint;
          };
          return {
            changes: result.changes as number,
            lastInsertRowid: result.lastInsertRowid as number | bigint,
          };
        },
        get(...params: unknown[]) {
          return stmt.get(...params) as Record<string, unknown> | undefined;
        },
        all(...params: unknown[]) {
          return stmt.all(...params) as Record<string, unknown>[];
        },
      };
    },
    close() {
      db.close();
    },
  };
}
