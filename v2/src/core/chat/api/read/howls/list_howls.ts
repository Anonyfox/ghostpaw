import type { DatabaseHandle } from "../../../../../lib/index.ts";
import type { HowlStatus, HowlSummary } from "../../../internal/howls/types.ts";

interface HowlSummaryRow {
  id: number;
  session_id: number;
  message: string;
  urgency: string;
  status: string;
  channel: string | null;
  delivery_mode: string | null;
  created_at: number;
}

export function listHowls(
  db: DatabaseHandle,
  options?: { status?: HowlStatus; limit?: number },
): HowlSummary[] {
  const limit = options?.limit ?? 20;

  if (options?.status) {
    const rows = db
      .prepare(
        `SELECT id, session_id, message, urgency, status, channel, delivery_mode, created_at
         FROM howls WHERE status = ?
         ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .all(options.status, limit) as unknown as HowlSummaryRow[];
    return rows.map(rowToSummary);
  }

  const rows = db
    .prepare(
      `SELECT id, session_id, message, urgency, status, channel, delivery_mode, created_at
       FROM howls ORDER BY created_at DESC, id DESC LIMIT ?`,
    )
    .all(limit) as unknown as HowlSummaryRow[];
  return rows.map(rowToSummary);
}

export function countHowlsToday(db: DatabaseHandle): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const row = db
    .prepare("SELECT COUNT(*) as count FROM howls WHERE created_at >= ?")
    .get(startOfDay.getTime()) as { count: number };
  return row.count;
}

export function lastHowlTime(db: DatabaseHandle): number | null {
  const row = db.prepare("SELECT created_at FROM howls ORDER BY created_at DESC LIMIT 1").get() as
    | { created_at: number }
    | undefined;
  return row?.created_at ?? null;
}

function rowToSummary(row: HowlSummaryRow): HowlSummary {
  return {
    id: row.id,
    sessionId: row.session_id,
    message: row.message,
    urgency: row.urgency as HowlSummary["urgency"],
    status: row.status as HowlSummary["status"],
    channel: row.channel,
    deliveryMode: row.delivery_mode as HowlSummary["deliveryMode"],
    createdAt: row.created_at,
  };
}
