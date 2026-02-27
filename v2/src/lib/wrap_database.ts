import type { DatabaseHandle } from "./database_handle.ts";

// biome-ignore lint/suspicious/noExplicitAny: node:sqlite DatabaseSync is untyped at runtime
export function wrapDatabase(raw: any): DatabaseHandle {
  return {
    exec: (sql: string) => raw.exec(sql),
    prepare: (sql: string) => raw.prepare(sql) as ReturnType<DatabaseHandle["prepare"]>,
    close: () => raw.close(),
  };
}
