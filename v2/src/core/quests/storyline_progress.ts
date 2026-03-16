import type { DatabaseHandle } from "../../lib/index.ts";
import type { StorylineProgress } from "./types.ts";

export function getStorylineProgress(db: DatabaseHandle, storylineId: number): StorylineProgress {
  const rows = db
    .prepare(`SELECT status, COUNT(*) as count FROM quests WHERE storyline_id = ? GROUP BY status`)
    .all(storylineId) as { status: string; count: number }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row.count;
  }

  const offered = counts.offered ?? 0;
  const total = rows.reduce((sum, r) => sum + r.count, 0) - offered;

  return {
    total,
    done: (counts.done ?? 0) + (counts.failed ?? 0) + (counts.abandoned ?? 0),
    active: counts.active ?? 0,
    accepted: counts.accepted ?? 0,
    blocked: counts.blocked ?? 0,
    offered,
  };
}
