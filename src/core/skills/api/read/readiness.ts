import type { DatabaseHandle } from "../../../../lib/index.ts";

export type ReadinessColor = "grey" | "green" | "yellow" | "orange";

export interface SkillReadiness {
  color: ReadinessColor;
  readsSinceCheckpoint: number;
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

  const reads = row?.reads ?? 0;
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
