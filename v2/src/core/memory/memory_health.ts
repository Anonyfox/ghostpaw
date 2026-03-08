import type { DatabaseHandle } from "../../lib/index.ts";

export interface MemoryHealth {
  active: number;
  strong: number;
  fading: number;
  faint: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  avgEvidence: number;
  singleEvidence: number;
  recentRevisions: number;
}

const THIRTY_DAYS_MS = 30 * 86_400_000;

export function memoryHealth(db: DatabaseHandle): MemoryHealth {
  const row = db
    .prepare(
      `SELECT
        COUNT(*) AS active,
        SUM(CASE WHEN confidence >= 0.7 THEN 1 ELSE 0 END) AS strong,
        SUM(CASE WHEN confidence >= 0.4 AND confidence < 0.7 THEN 1 ELSE 0 END) AS fading,
        SUM(CASE WHEN confidence < 0.4 THEN 1 ELSE 0 END) AS faint,
        COALESCE(AVG(evidence_count), 0) AS avg_evidence,
        SUM(CASE WHEN evidence_count = 1 THEN 1 ELSE 0 END) AS single_evidence
      FROM memories WHERE superseded_by IS NULL`,
    )
    .get() as Record<string, number>;

  const sourceRows = db
    .prepare(
      `SELECT source, COUNT(*) AS cnt FROM memories
       WHERE superseded_by IS NULL GROUP BY source`,
    )
    .all() as Array<{ source: string; cnt: number }>;

  const catRows = db
    .prepare(
      `SELECT category, COUNT(*) AS cnt FROM memories
       WHERE superseded_by IS NULL GROUP BY category`,
    )
    .all() as Array<{ category: string; cnt: number }>;

  const revRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM memories
       WHERE superseded_by IS NOT NULL AND created_at >= ?`,
    )
    .get(Date.now() - THIRTY_DAYS_MS) as { cnt: number };

  const bySource: Record<string, number> = {};
  for (const r of sourceRows) bySource[r.source] = r.cnt;

  const byCategory: Record<string, number> = {};
  for (const r of catRows) byCategory[r.category] = r.cnt;

  return {
    active: row.active ?? 0,
    strong: row.strong ?? 0,
    fading: row.fading ?? 0,
    faint: row.faint ?? 0,
    bySource,
    byCategory,
    avgEvidence: Math.round((row.avg_evidence ?? 0) * 100) / 100,
    singleEvidence: row.single_evidence ?? 0,
    recentRevisions: revRow.cnt,
  };
}
