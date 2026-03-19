import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { HowlStatus } from "./types.ts";

export interface HowlResolutionUpdate {
  status: HowlStatus;
  responseMessageId?: number | null;
}

export function updateHowlStatus(
  db: DatabaseHandle,
  id: number,
  status: HowlStatus,
  responseMessageId?: number | null,
): void {
  const now = status === "responded" || status === "dismissed" ? Date.now() : null;
  db.prepare(
    `UPDATE howls
     SET status = ?,
         responded_at = COALESCE(?, responded_at),
         response_message_id = COALESCE(?, response_message_id)
     WHERE id = ?`,
  ).run(status, now, responseMessageId ?? null, id);
}

export function updateHowlChannel(db: DatabaseHandle, id: number, channel: string): void {
  db.prepare("UPDATE howls SET channel = ? WHERE id = ?").run(channel, id);
}

export function updateHowlDelivery(
  db: DatabaseHandle,
  id: number,
  input: {
    channel: string | null;
    deliveryAddress: string | null;
    deliveryMessageId: string | null;
    deliveryMode: string | null;
  },
): void {
  db.prepare(
    `UPDATE howls
     SET channel = ?,
         delivery_address = ?,
         delivery_message_id = ?,
         delivery_mode = ?
     WHERE id = ?`,
  ).run(input.channel, input.deliveryAddress, input.deliveryMessageId, input.deliveryMode, id);
}
