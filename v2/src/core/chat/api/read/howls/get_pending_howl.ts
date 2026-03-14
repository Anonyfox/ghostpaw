import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { getSessionByKey } from "../../../get_session_by_key.ts";
import type { Howl } from "../../../internal/howls/types.ts";
import { getHowl } from "./get_howl.ts";

export function getPendingHowlCountForTelegramChat(db: DatabaseHandle, chatId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM howls
       WHERE status = 'pending' AND channel = 'telegram' AND delivery_address = ?`,
    )
    .get(String(chatId)) as { count: number };
  return row.count;
}

export function getHowlByTelegramReplyTarget(
  db: DatabaseHandle,
  chatId: number,
  replyToMessageId: number,
): Howl | null {
  const row = db
    .prepare(
      `SELECT id
       FROM howls
       WHERE status = 'pending'
         AND channel = 'telegram'
         AND delivery_address = ?
         AND delivery_message_id = ?
       LIMIT 1`,
    )
    .get(String(chatId), String(replyToMessageId)) as { id: number } | undefined;
  if (!row) return null;
  return getHowl(db, row.id);
}

export function getResolvableTelegramHowlFromPlainText(
  db: DatabaseHandle,
  chatId: number,
): Howl | null {
  const rows = db
    .prepare(
      `SELECT id
       FROM howls
       WHERE status = 'pending'
         AND channel = 'telegram'
         AND delivery_address = ?
       ORDER BY created_at DESC, id DESC`,
    )
    .all(String(chatId)) as { id: number }[];
  if (rows.length !== 1) return null;

  const howl = getHowl(db, rows[0]!.id);
  if (!howl) return null;

  const directSession = getSessionByKey(db, `telegram:${chatId}`);
  if (directSession && directSession.lastActiveAt > howl.createdAt) {
    return null;
  }

  return howl;
}

export function countPendingHowls(db: DatabaseHandle): number {
  const row = db.prepare("SELECT COUNT(*) AS cnt FROM howls WHERE status = 'pending'").get() as {
    cnt: number;
  };
  return row.cnt;
}
