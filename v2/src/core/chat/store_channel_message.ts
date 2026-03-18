import type { DatabaseHandle } from "../../lib/index.ts";

export interface StoreChannelMessageInput {
  sessionId: number;
  messageId: number;
  channel: string;
  channelMessageId: string;
  direction: "in" | "out";
}

export interface ChannelMessageRecord {
  id: number;
  messageId: number;
  channel: string;
  channelMessageId: string;
  direction: "in" | "out";
}

export function storeChannelMessage(
  db: DatabaseHandle,
  input: StoreChannelMessageInput,
): ChannelMessageRecord {
  const now = Date.now();
  const result = db
    .prepare(
      `INSERT INTO channel_messages
       (session_id, message_id, channel, channel_message_id, direction, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.sessionId,
      input.messageId,
      input.channel,
      input.channelMessageId,
      input.direction,
      now,
    );

  return {
    id: Number(result.lastInsertRowid),
    messageId: input.messageId,
    channel: input.channel,
    channelMessageId: input.channelMessageId,
    direction: input.direction,
  };
}
