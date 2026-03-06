import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToQuest } from "./row_to_quest.ts";
import type { Quest, TemporalContext } from "./types.ts";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Builds a snapshot of time-sensitive quest state for injection into
 * the agent's context window. All queries use the current time.
 */
export function getTemporalContext(db: DatabaseHandle): TemporalContext {
  const now = Date.now();

  const excludeList = "('offered','done','failed','cancelled')";

  const overdue = query(
    db,
    `SELECT * FROM quests
     WHERE due_at IS NOT NULL AND due_at < ? AND status NOT IN ${excludeList}
     ORDER BY due_at ASC`,
    now,
  );

  const dueSoon = query(
    db,
    `SELECT * FROM quests
     WHERE due_at IS NOT NULL AND due_at >= ? AND due_at <= ? AND status NOT IN ${excludeList}
     ORDER BY due_at ASC`,
    now,
    now + SEVEN_DAYS,
  );

  const startOfDay = now - (now % 86400000);
  const endOfDay = startOfDay + 86400000;
  const todayEvents = query(
    db,
    `SELECT * FROM quests
     WHERE starts_at IS NOT NULL AND starts_at >= ? AND starts_at < ? AND status NOT IN ${excludeList}
     ORDER BY starts_at ASC`,
    startOfDay,
    endOfDay,
  );

  const activeQuests = query(
    db,
    `SELECT * FROM quests WHERE status = 'active' ORDER BY updated_at DESC LIMIT 20`,
  );

  const pendingReminders = query(
    db,
    `SELECT * FROM quests
     WHERE remind_at IS NOT NULL AND remind_at <= ?
       AND status NOT IN ${excludeList}
       AND (reminded_at IS NULL OR reminded_at < remind_at)
     ORDER BY remind_at ASC`,
    now,
  );

  return { overdue, dueSoon, todayEvents, activeQuests, pendingReminders };
}

function query(db: DatabaseHandle, sql: string, ...params: unknown[]): Quest[] {
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToQuest);
}
