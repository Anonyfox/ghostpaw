import type { ChatFactory } from "../core/chat/chat_instance.ts";
import { getSession } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { ELIGIBLE_PURPOSES, MIN_SUBSTANTIVE_MESSAGES } from "./distill_types.ts";
import { distillSession } from "./oneshots/distill_session.ts";

/**
 * Background hook triggered after a session is closed.
 * Returns a promise if distillation work was started, or null
 * if the session is ineligible. Failure is silently swallowed —
 * distillation is best-effort background work.
 */
export function handlePostSession(
  db: DatabaseHandle,
  sessionId: number,
  model: string,
  createChat: ChatFactory,
): Promise<void> | null {
  const session = getSession(db, sessionId);
  if (!session) return null;
  if (!(ELIGIBLE_PURPOSES as readonly string[]).includes(session.purpose)) return null;
  if (session.distilledAt !== null) return null;

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM messages
       WHERE session_id = ?
         AND role IN ('user', 'assistant')
         AND is_compaction = 0`,
    )
    .get(sessionId) as { cnt: number };

  if (countRow.cnt < MIN_SUBSTANTIVE_MESSAGES) return null;

  return distillSession(db, sessionId, model, createChat)
    .then(() => {})
    .catch(() => {});
}
