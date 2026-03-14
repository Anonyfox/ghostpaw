import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Howl, StoreHowlInput } from "./types.ts";

export function storeHowl(db: DatabaseHandle, input: StoreHowlInput): Howl {
  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO howls (
         session_id,
         origin_session_id,
         origin_message_id,
         message,
         urgency,
         channel,
         delivery_address,
         delivery_message_id,
         delivery_mode,
         status,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      input.sessionId,
      input.originSessionId,
      input.originMessageId ?? null,
      input.message,
      input.urgency,
      input.channel ?? null,
      input.deliveryAddress ?? null,
      input.deliveryMessageId ?? null,
      input.deliveryMode ?? null,
      now,
    );

  return {
    id: result.lastInsertRowid as number,
    sessionId: input.sessionId,
    originSessionId: input.originSessionId,
    originMessageId: input.originMessageId ?? null,
    message: input.message,
    urgency: input.urgency,
    channel: input.channel ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    deliveryMessageId: input.deliveryMessageId ?? null,
    deliveryMode: input.deliveryMode ?? null,
    status: "pending",
    createdAt: now,
    respondedAt: null,
    responseMessageId: null,
  };
}
