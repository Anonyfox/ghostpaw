export interface PreparedStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
}

export interface DatabaseHandle {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
}
