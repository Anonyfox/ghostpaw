import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { SkillEventType } from "../types.ts";

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
