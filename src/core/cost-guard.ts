/**
 * Cost guard — rolling-window spend limiter backed by the runs table.
 *
 * All functions accept a raw DatabaseSync-style `sqlite` object so they
 * can be tested trivially with :memory: databases. The guard is a pure
 * read-only query layer — it never mutates state.
 */

const DEFAULT_WINDOW_MS = 86_400_000; // 24 hours

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpendStatus {
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  isBlocked: boolean;
  windowMs: number;
}

export interface ModelSpend {
  model: string;
  cost: number;
  runs: number;
  tokensIn: number;
  tokensOut: number;
}

export interface DaySpend {
  date: string;
  cost: number;
  runs: number;
}

export interface SpendBreakdown extends SpendStatus {
  byModel: ModelSpend[];
  byDay: DaySpend[];
}

interface SqliteHandle {
  prepare(sql: string): {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  };
}

// ── Core queries ─────────────────────────────────────────────────────────────

export function getSpendInWindow(sqlite: SqliteHandle, windowMs = DEFAULT_WINDOW_MS): number {
  const cutoff = Date.now() - windowMs;
  const row = sqlite
    .prepare("SELECT COALESCE(SUM(cost_usd), 0) AS total FROM runs WHERE created_at >= ?")
    .get(cutoff) as { total: number } | undefined;
  return row?.total ?? 0;
}

export function isSpendBlocked(
  sqlite: SqliteHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  if (limitUsd <= 0) return false;
  return getSpendInWindow(sqlite, windowMs) >= limitUsd;
}

export function getSpendStatus(
  sqlite: SqliteHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): SpendStatus {
  const spent = getSpendInWindow(sqlite, windowMs);
  const limit = Math.max(limitUsd, 0);
  const remaining = limit > 0 ? Math.max(limit - spent, 0) : Number.POSITIVE_INFINITY;
  const percentage = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
  const isBlocked = limit > 0 && spent >= limit;
  return { spent, limit, remaining, percentage, isBlocked, windowMs };
}

export function getSpendBreakdown(
  sqlite: SqliteHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): SpendBreakdown {
  const status = getSpendStatus(sqlite, limitUsd, windowMs);
  const cutoff = Date.now() - windowMs;

  const modelRows = sqlite
    .prepare(
      `SELECT model, SUM(cost_usd) AS cost, COUNT(*) AS runs,
              SUM(tokens_in) AS tokens_in, SUM(tokens_out) AS tokens_out
       FROM runs WHERE created_at >= ? AND model IS NOT NULL
       GROUP BY model ORDER BY cost DESC`,
    )
    .all(cutoff) as Record<string, unknown>[];

  const byModel: ModelSpend[] = modelRows.map((r) => ({
    model: r.model as string,
    cost: (r.cost as number) ?? 0,
    runs: (r.runs as number) ?? 0,
    tokensIn: (r.tokens_in as number) ?? 0,
    tokensOut: (r.tokens_out as number) ?? 0,
  }));

  const dayRows = sqlite
    .prepare(
      `SELECT (created_at / 86400000) AS bucket, SUM(cost_usd) AS cost, COUNT(*) AS runs
       FROM runs WHERE created_at >= ?
       GROUP BY bucket ORDER BY bucket DESC`,
    )
    .all(cutoff) as Record<string, unknown>[];

  const byDay: DaySpend[] = dayRows.map((r) => {
    const ms = (r.bucket as number) * 86_400_000;
    return {
      date: new Date(ms).toISOString().slice(0, 10),
      cost: (r.cost as number) ?? 0,
      runs: (r.runs as number) ?? 0,
    };
  });

  return { ...status, byModel, byDay };
}

// ── Guard interface for injection into loop/delegate ─────────────────────────

export interface CostGuard {
  isBlocked(): boolean;
  status(): SpendStatus;
}

export function createCostGuard(
  sqlite: SqliteHandle,
  limitUsd: number,
  windowMs = DEFAULT_WINDOW_MS,
): CostGuard {
  return {
    isBlocked: () => isSpendBlocked(sqlite, limitUsd, windowMs),
    status: () => getSpendStatus(sqlite, limitUsd, windowMs),
  };
}
