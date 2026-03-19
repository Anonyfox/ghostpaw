import type { DatabaseHandle } from "../../lib/index.ts";

export function lookupByChannelId(
  db: DatabaseHandle,
  channel: string,
  channelMessageId: string,
): { messageId: number; sessionId: number } | null {
  const row = db
    .prepare(
      "SELECT message_id, session_id FROM channel_messages WHERE channel = ? AND channel_message_id = ?",
    )
    .get(channel, channelMessageId) as Record<string, unknown> | undefined;

  if (!row) return null;
  return {
    messageId: row.message_id as number,
    sessionId: row.session_id as number,
  };
}

export function lookupByMessageId(
  db: DatabaseHandle,
  messageId: number,
): { channel: string; channelMessageId: string }[] {
  const rows = db
    .prepare("SELECT channel, channel_message_id FROM channel_messages WHERE message_id = ?")
    .all(messageId) as Record<string, unknown>[];

  return rows.map((row) => ({
    channel: row.channel as string,
    channelMessageId: row.channel_message_id as string,
  }));
}
