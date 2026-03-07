import type { DatabaseHandle } from "../../lib/index.ts";
import type { Howl } from "./types.ts";

interface HowlRow {
  id: number;
  session_id: number;
  message: string;
  urgency: string;
  channel: string | null;
  status: string;
  created_at: number;
  responded_at: number | null;
}

/**
 * Returns the oldest pending howl, or null if none exist.
 * FIFO: the first unanswered howl is resolved before the next surfaces.
 */
export function getPendingHowl(db: DatabaseHandle): Howl | null {
  const row = db
    .prepare("SELECT * FROM howls WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1")
    .get() as HowlRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    message: row.message,
    urgency: row.urgency as Howl["urgency"],
    channel: row.channel,
    status: row.status as Howl["status"],
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

/**
 * Returns the count of pending howls.
 */
export function countPendingHowls(db: DatabaseHandle): number {
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM howls WHERE status = 'pending'").get() as {
    cnt: number;
  };
  return row.cnt;
}
