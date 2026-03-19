import type { DatabaseHandle } from "../../lib/index.ts";

export interface MemberCounts {
  active: number;
  dormant: number;
  lost: number;
  total: number;
}

export function countMembers(db: DatabaseHandle): MemberCounts {
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS count FROM pack_members GROUP BY status`)
    .all() as { status: string; count: number }[];

  const counts: MemberCounts = { active: 0, dormant: 0, lost: 0, total: 0 };
  for (const row of rows) {
    if (row.status === "active") counts.active = row.count;
    else if (row.status === "dormant") counts.dormant = row.count;
    else if (row.status === "lost") counts.lost = row.count;
    counts.total += row.count;
  }
  return counts;
}
