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
