import type { DatabaseHandle } from "../../lib/index.ts";
import type { Howl, StoreHowlInput } from "./types.ts";

export function storeHowl(db: DatabaseHandle, input: StoreHowlInput): Howl {
  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO howls (session_id, message, urgency, channel, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .run(input.sessionId, input.message, input.urgency, input.channel ?? null, now);

  return {
    id: result.lastInsertRowid as number,
    sessionId: input.sessionId,
    message: input.message,
    urgency: input.urgency,
    channel: input.channel ?? null,
    status: "pending",
    createdAt: now,
    respondedAt: null,
  };
}
