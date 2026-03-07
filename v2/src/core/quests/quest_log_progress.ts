import type { DatabaseHandle } from "../../lib/index.ts";
import type { QuestLogProgress } from "./types.ts";

export function getQuestLogProgress(db: DatabaseHandle, questLogId: number): QuestLogProgress {
  const rows = db
    .prepare(`SELECT status, COUNT(*) as count FROM quests WHERE quest_log_id = ? GROUP BY status`)
    .all(questLogId) as { status: string; count: number }[];

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row.count;
  }

  const offered = counts.offered ?? 0;
  const total = rows.reduce((sum, r) => sum + r.count, 0) - offered;

  return {
    total,
    done: (counts.done ?? 0) + (counts.failed ?? 0) + (counts.cancelled ?? 0),
    active: counts.active ?? 0,
    pending: counts.pending ?? 0,
    blocked: counts.blocked ?? 0,
    offered,
  };
}
