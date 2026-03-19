import type { DatabaseHandle } from "../../lib/index.ts";
import type { DailyCostEntry } from "./cost_types.ts";

function dateMidnight(daysAgo: number): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).getTime();
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getDailyCostTrend(db: DatabaseHandle, days: number): DailyCostEntry[] {
  const rangeStart = dateMidnight(days - 1);
  const rangeEnd = dateMidnight(-1);

  const rows = db
    .prepare(
      `SELECT
        CAST((last_active_at - ?) / 86400000 AS INTEGER) AS bucket,
        COALESCE(SUM(cost_usd), 0) AS costUsd,
        COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens,
        COUNT(CASE WHEN cost_usd > 0 THEN 1 END) AS sessionCount
      FROM sessions
      WHERE last_active_at >= ? AND last_active_at < ?
      GROUP BY bucket`,
    )
    .all(rangeStart, rangeStart, rangeEnd) as {
    bucket: number;
    costUsd: number;
    tokens: number;
    sessionCount: number;
  }[];

  const byBucket = new Map<number, (typeof rows)[0]>();
  for (const r of rows) byBucket.set(r.bucket, r);

  const entries: DailyCostEntry[] = [];
  for (let i = 0; i < days; i++) {
    const data = byBucket.get(days - 1 - i);
    entries.push({
      date: formatDate(dateMidnight(i)),
      costUsd: data?.costUsd ?? 0,
      tokens: data?.tokens ?? 0,
      sessionCount: data?.sessionCount ?? 0,
    });
  }

  return entries;
}
