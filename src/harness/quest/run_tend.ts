import { listQuests } from "../../core/quests/api/read/index.ts";
import { dismissQuest } from "../../core/quests/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { log } from "../../lib/terminal/index.ts";

const STALE_BOARD_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const STUCK_THRESHOLD_MS = 48 * 60 * 60 * 1000;

export function runTend(db: DatabaseHandle): void {
  const now = Date.now();
  const cutoff = now - STALE_BOARD_AGE_MS;

  const offered = listQuests(db, { status: "offered", limit: 1000 });
  let dismissed = 0;
  for (const q of offered) {
    if (q.dueAt == null && q.createdAt < cutoff) {
      try {
        dismissQuest(db, q.id);
        dismissed++;
      } catch {
        /* already transitioned */
      }
    }
  }

  if (dismissed > 0) {
    log.info(`tend: dismissed ${dismissed} stale board entr${dismissed === 1 ? "y" : "ies"}`);
  }

  const active = listQuests(db, { status: "active", limit: 1000 });
  const stuckCount = active.filter((q) => q.updatedAt < now - STUCK_THRESHOLD_MS).length;
  if (stuckCount > 0) {
    log.warn(`tend: ${stuckCount} active quest(s) with no update in 48h`);
  }
}
