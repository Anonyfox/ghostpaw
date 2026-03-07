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

function rowToHowl(row: HowlRow): Howl {
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

export function getHowl(db: DatabaseHandle, id: number): Howl | null {
  const row = db.prepare("SELECT * FROM howls WHERE id = ?").get(id) as HowlRow | undefined;
  return row ? rowToHowl(row) : null;
}

export function getHowlBySessionId(db: DatabaseHandle, sessionId: number): Howl | null {
  const row = db.prepare("SELECT * FROM howls WHERE session_id = ?").get(sessionId) as
    | HowlRow
    | undefined;
  return row ? rowToHowl(row) : null;
}
