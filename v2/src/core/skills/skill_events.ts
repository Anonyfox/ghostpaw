import type { DatabaseHandle } from "../../lib/index.ts";

export type SkillEventType = "read" | "checkpoint" | "created" | "retired";

export type ReadinessColor = "grey" | "green" | "yellow" | "orange";

export interface SkillReadiness {
  color: ReadinessColor;
  readsSinceCheckpoint: number;
}

export function initSkillEventsTables(db: DatabaseHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS skill_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      skill      TEXT    NOT NULL,
      event      TEXT    NOT NULL,
      session_id TEXT,
      ts         INTEGER DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_skill_events_skill
    ON skill_events(skill, event, id)
  `);
}

export function logSkillEvent(
  db: DatabaseHandle,
  skill: string,
  event: SkillEventType,
  sessionId?: string,
): void {
  db.prepare("INSERT INTO skill_events (skill, event, session_id) VALUES (?, ?, ?)").run(
    skill,
    event,
    sessionId ?? null,
  );
}

export function skillReadiness(db: DatabaseHandle, name: string): SkillReadiness {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS reads FROM skill_events
       WHERE skill = ? AND event = 'read'
         AND id > COALESCE(
           (SELECT MAX(id) FROM skill_events WHERE skill = ? AND event = 'checkpoint'),
           0
         )`,
    )
    .get(name, name) as { reads: number } | undefined;

  const reads = (row?.reads as number) ?? 0;
  return { color: readinessColor(reads), readsSinceCheckpoint: reads };
}

export function readinessForAll(
  db: DatabaseHandle,
  names: string[],
): Record<string, SkillReadiness> {
  const result: Record<string, SkillReadiness> = {};
  for (const name of names) {
    result[name] = skillReadiness(db, name);
  }
  return result;
}

function readinessColor(reads: number): ReadinessColor {
  if (reads >= 6) return "orange";
  if (reads >= 3) return "yellow";
  if (reads >= 1) return "green";
  return "grey";
}
