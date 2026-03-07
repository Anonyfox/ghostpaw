import type { DatabaseHandle } from "../../lib/index.ts";
import type { Howl } from "./types.ts";

interface HowlRow {
  id: number;
  origin_session_id: number;
  origin_message_id: number | null;
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
    originSessionId: row.origin_session_id,
    originMessageId: row.origin_message_id,
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
