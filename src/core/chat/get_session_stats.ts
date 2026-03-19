import type { DatabaseHandle } from "../../lib/index.ts";

export interface SessionStats {
  total: number;
  open: number;
  closed: number;
  distilled: number;
  byChannel: Record<string, number>;
  byPurpose: Record<string, number>;
}

export function getSessionStats(db: DatabaseHandle): SessionStats {
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN closed_at IS NULL THEN 1 END) AS open,
        COUNT(CASE WHEN closed_at IS NOT NULL AND distilled_at IS NULL THEN 1 END) AS closed,
        COUNT(CASE WHEN distilled_at IS NOT NULL THEN 1 END) AS distilled
      FROM sessions`,
    )
    .get() as { total: number; open: number; closed: number; distilled: number };

  const channelRows = db
    .prepare(
      `SELECT
        CASE
          WHEN key LIKE 'web:%' THEN 'web'
          WHEN key LIKE 'telegram:%' THEN 'telegram'
          WHEN key LIKE 'delegate:%' THEN 'delegate'
          WHEN key LIKE 'system:%' THEN 'system'
          WHEN key LIKE 'cli:%' THEN 'cli'
          ELSE 'other'
        END AS channel,
        COUNT(*) AS cnt
      FROM sessions GROUP BY channel`,
    )
    .all() as { channel: string; cnt: number }[];

  const byChannel: Record<string, number> = {};
  for (const r of channelRows) byChannel[r.channel] = r.cnt;

  const purposeRows = db
    .prepare("SELECT purpose, COUNT(*) AS cnt FROM sessions GROUP BY purpose")
    .all() as { purpose: string; cnt: number }[];

  const byPurpose: Record<string, number> = {};
  for (const r of purposeRows) byPurpose[r.purpose] = r.cnt;

  return { ...totals, byChannel, byPurpose };
}
