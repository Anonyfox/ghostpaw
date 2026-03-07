import type { DatabaseHandle } from "../../lib/index.ts";
import type { Howl, StoreHowlInput } from "./types.ts";

export function storeHowl(db: DatabaseHandle, input: StoreHowlInput): Howl {
  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO howls (origin_session_id, origin_message_id, message, urgency, channel, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.originSessionId,
      input.originMessageId ?? null,
      input.message,
      input.urgency,
      input.channel ?? null,
      now,
    );

  return {
    id: result.lastInsertRowid as number,
    originSessionId: input.originSessionId,
    originMessageId: input.originMessageId ?? null,
    message: input.message,
    urgency: input.urgency,
    channel: input.channel ?? null,
    status: "pending",
    createdAt: now,
    respondedAt: null,
  };
}
