import type { DatabaseHandle } from "../../lib/index.ts";

export interface SkillEvent {
  id: number;
  skill: string;
  event: string;
  sessionId: string | null;
  ts: number;
}

function rowToSkillEvent(row: Record<string, unknown>): SkillEvent {
  return {
    id: row.id as number,
    skill: row.skill as string,
    event: row.event as string,
    sessionId: (row.session_id as string | null) ?? null,
    ts: row.ts as number,
  };
}

export function skillEventsSince(db: DatabaseHandle, sinceMs: number): SkillEvent[] {
  const sinceSec = Math.floor(sinceMs / 1000);
  const rows = db
    .prepare("SELECT * FROM skill_events WHERE ts >= ? ORDER BY ts DESC")
    .all(sinceSec) as Record<string, unknown>[];
  return rows.map(rowToSkillEvent);
}
