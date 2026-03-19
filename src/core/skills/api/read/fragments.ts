import type { DatabaseHandle } from "../../../../lib/index.ts";

export type FragmentSource = "quest" | "session" | "coordinator" | "historian" | "stoke";
export type FragmentStatus = "pending" | "absorbed" | "expired";

export interface SkillFragment {
  id: number;
  source: FragmentSource;
  sourceId: string | null;
  observation: string;
  domain: string | null;
  status: FragmentStatus;
  consumedBy: string | null;
  createdAt: number;
}

export interface SourceCounts {
  pending: number;
  absorbed: number;
}

export function pendingFragments(db: DatabaseHandle, domain?: string): SkillFragment[] {
  const sql = domain
    ? "SELECT * FROM skill_fragments WHERE status = 'pending' AND domain = ? ORDER BY created_at"
    : "SELECT * FROM skill_fragments WHERE status = 'pending' ORDER BY created_at";
  const rows = domain ? db.prepare(sql).all(domain) : db.prepare(sql).all();
  return rows.map(toFragment);
}

export function pendingFragmentCount(db: DatabaseHandle): number {
  const row = db
    .prepare("SELECT COUNT(*) AS cnt FROM skill_fragments WHERE status = 'pending'")
    .get() as { cnt: number };
  return row.cnt;
}

export function listFragments(
  db: DatabaseHandle,
  opts?: { status?: FragmentStatus; limit?: number },
): SkillFragment[] {
  const limit = opts?.limit ?? 100;
  const sql = opts?.status
    ? "SELECT * FROM skill_fragments WHERE status = ? ORDER BY created_at DESC LIMIT ?"
    : "SELECT * FROM skill_fragments WHERE status != 'expired' ORDER BY created_at DESC LIMIT ?";
  const rows = opts?.status ? db.prepare(sql).all(opts.status, limit) : db.prepare(sql).all(limit);
  return rows.map(toFragment);
}

export function fragmentCountsBySource(
  db: DatabaseHandle,
): Partial<Record<FragmentSource, SourceCounts>> {
  const rows = db
    .prepare(
      `SELECT source, status, COUNT(*) AS cnt FROM skill_fragments
       WHERE status IN ('pending', 'absorbed')
       GROUP BY source, status`,
    )
    .all() as { source: string; status: string; cnt: number }[];

  const result: Partial<Record<FragmentSource, SourceCounts>> = {};
  for (const row of rows) {
    const src = row.source as FragmentSource;
    if (!result[src]) result[src] = { pending: 0, absorbed: 0 };
    if (row.status === "pending") result[src]!.pending = row.cnt;
    else if (row.status === "absorbed") result[src]!.absorbed = row.cnt;
  }
  return result;
}

function toFragment(row: Record<string, unknown>): SkillFragment {
  return {
    id: row.id as number,
    source: row.source as FragmentSource,
    sourceId: row.source_id as string | null,
    observation: row.observation as string,
    domain: row.domain as string | null,
    status: row.status as FragmentStatus,
    consumedBy: row.consumed_by as string | null,
    createdAt: row.created_at as number,
  };
}
