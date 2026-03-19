import type { DatabaseHandle } from "../../../../lib/index.ts";

export interface SkillProposal {
  id: number;
  title: string;
  rationale: string;
  fragmentIds: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: number;
}

export function pendingProposals(db: DatabaseHandle): SkillProposal[] {
  const rows = db
    .prepare("SELECT * FROM skill_proposals WHERE status = 'pending' ORDER BY created_at")
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    id: row.id as number,
    title: row.title as string,
    rationale: row.rationale as string,
    fragmentIds: row.fragment_ids as string,
    status: row.status as SkillProposal["status"],
    createdAt: row.created_at as number,
  }));
}
