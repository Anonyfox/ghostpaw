import type { DatabaseHandle } from "../../lib/index.ts";

export interface SkillHealthData {
  computedAt: number;
  totalSkills: number;
  rankDistribution: Record<string, number>;
  staleSkills: string[];
  dormantSkills: string[];
  oversizedSkills: string[];
  pendingFragments: number;
  expiredFragments: number;
  repairsApplied: number;
  proposalsQueued: number;
  explored: boolean;
}

export interface SkillProposal {
  id: number;
  title: string;
  rationale: string;
  fragmentIds: string;
  status: "pending" | "approved" | "dismissed";
  createdAt: number;
}

export function initSkillHealthTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_health (
      computed_at       INTEGER DEFAULT (unixepoch()),
      total_skills      INTEGER,
      rank_distribution TEXT,
      stale_skills      TEXT,
      dormant_skills    TEXT,
      oversized_skills  TEXT,
      pending_fragments INTEGER,
      expired_fragments INTEGER,
      repairs_applied   INTEGER,
      proposals_queued  INTEGER,
      explored          INTEGER
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_proposals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      rationale    TEXT    NOT NULL,
      fragment_ids TEXT    NOT NULL DEFAULT '[]',
      status       TEXT    NOT NULL DEFAULT 'pending',
      created_at   INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_proposals_status
    ON skill_proposals(status)
  `);
}

export function writeSkillHealth(db: DatabaseHandle, data: SkillHealthData): void {
  db.prepare(
    `INSERT INTO skill_health
     (total_skills, rank_distribution, stale_skills, dormant_skills, oversized_skills,
      pending_fragments, expired_fragments, repairs_applied, proposals_queued, explored)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    data.totalSkills,
    JSON.stringify(data.rankDistribution),
    JSON.stringify(data.staleSkills),
    JSON.stringify(data.dormantSkills),
    JSON.stringify(data.oversizedSkills),
    data.pendingFragments,
    data.expiredFragments,
    data.repairsApplied,
    data.proposalsQueued,
    data.explored ? 1 : 0,
  );
}

export function readSkillHealth(db: DatabaseHandle): SkillHealthData | null {
  const row = db.prepare("SELECT * FROM skill_health ORDER BY rowid DESC LIMIT 1").get() as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return toHealthData(row);
}

export function queueProposal(
  db: DatabaseHandle,
  title: string,
  rationale: string,
  fragmentIds: number[],
): void {
  db.prepare("INSERT INTO skill_proposals (title, rationale, fragment_ids) VALUES (?, ?, ?)").run(
    title,
    rationale,
    JSON.stringify(fragmentIds),
  );
}

export function pendingProposals(db: DatabaseHandle): SkillProposal[] {
  const rows = db
    .prepare("SELECT * FROM skill_proposals WHERE status = 'pending' ORDER BY created_at")
    .all();
  return rows.map(toProposal);
}

export function dismissProposal(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE skill_proposals SET status = 'dismissed' WHERE id = ?").run(id);
}

export function approveProposal(db: DatabaseHandle, id: number): void {
  db.prepare("UPDATE skill_proposals SET status = 'approved' WHERE id = ?").run(id);
}

function toHealthData(row: Record<string, unknown>): SkillHealthData {
  return {
    computedAt: row.computed_at as number,
    totalSkills: row.total_skills as number,
    rankDistribution: JSON.parse((row.rank_distribution as string) || "{}"),
    staleSkills: JSON.parse((row.stale_skills as string) || "[]"),
    dormantSkills: JSON.parse((row.dormant_skills as string) || "[]"),
    oversizedSkills: JSON.parse((row.oversized_skills as string) || "[]"),
    pendingFragments: row.pending_fragments as number,
    expiredFragments: row.expired_fragments as number,
    repairsApplied: row.repairs_applied as number,
    proposalsQueued: row.proposals_queued as number,
    explored: (row.explored as number) === 1,
  };
}

function toProposal(row: Record<string, unknown>): SkillProposal {
  return {
    id: row.id as number,
    title: row.title as string,
    rationale: row.rationale as string,
    fragmentIds: row.fragment_ids as string,
    status: row.status as SkillProposal["status"],
    createdAt: row.created_at as number,
  };
}
