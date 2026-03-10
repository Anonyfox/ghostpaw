import type { DatabaseHandle } from "../../lib/index.ts";

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

export function initSkillFragmentsTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_fragments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      source_id   TEXT,
      observation TEXT    NOT NULL,
      domain      TEXT,
      status      TEXT    NOT NULL DEFAULT 'pending',
      consumed_by TEXT,
      created_at  INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_fragments_status
    ON skill_fragments(status, domain)
  `);
}

export function dropSkillFragment(
  db: DatabaseHandle,
  source: string,
  sourceId: string | null,
  observation: string,
  domain?: string,
): void {
  db.prepare(
    "INSERT INTO skill_fragments (source, source_id, observation, domain) VALUES (?, ?, ?, ?)",
  ).run(source, sourceId, observation, domain ?? null);
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

export function absorbFragment(db: DatabaseHandle, id: number, skillName: string): void {
  db.prepare("UPDATE skill_fragments SET status = 'absorbed', consumed_by = ? WHERE id = ?").run(
    skillName,
    id,
  );
}

export function expireStaleFragments(db: DatabaseHandle, maxAgeDays = 90): void {
  db.prepare(
    `UPDATE skill_fragments SET status = 'expired'
     WHERE status = 'pending' AND created_at < unixepoch() - ? * 86400`,
  ).run(maxAgeDays);
}

export function enforceFragmentCap(db: DatabaseHandle, cap = 50): void {
  const count = pendingFragmentCount(db);
  if (count <= cap) return;

  db.prepare(
    `UPDATE skill_fragments SET status = 'expired'
     WHERE id IN (
       SELECT id FROM skill_fragments
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?
     )`,
  ).run(count - cap);
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
