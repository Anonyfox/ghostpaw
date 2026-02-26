interface StatementSync {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

export interface DatabaseHandle {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
}

export async function openDatabase(path: string): Promise<DatabaseHandle> {
  const mod = await loadSqlite();
  const db = new mod.DatabaseSync(path);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  return wrapDatabase(db);
}

export async function openTestDatabase(): Promise<DatabaseHandle> {
  const mod = await loadSqlite();
  const db = new mod.DatabaseSync(":memory:");

  db.exec("PRAGMA foreign_keys = ON");

  return wrapDatabase(db);
}

async function loadSqlite() {
  try {
    return await import("node:sqlite");
  } catch (err) {
    throw new Error("Failed to load node:sqlite. Ensure Node.js >= 24 is installed.", {
      cause: err,
    });
  }
}

// biome-ignore lint/suspicious/noExplicitAny: node:sqlite DatabaseSync is untyped at runtime
function wrapDatabase(raw: any): DatabaseHandle {
  return {
    exec: (sql: string) => raw.exec(sql),
    prepare: (sql: string) => raw.prepare(sql) as StatementSync,
    close: () => raw.close(),
  };
}
