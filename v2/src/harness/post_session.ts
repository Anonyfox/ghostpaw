import type { ChatFactory } from "../core/chat/chat_instance.ts";
import { countSubstantiveMessages, getSession } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { ELIGIBLE_PURPOSES, MIN_SUBSTANTIVE_MESSAGES } from "./distill_types.ts";
import { distillSession } from "./oneshots/distill_session.ts";

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

  const count = countSubstantiveMessages(db, sessionId);
  if (count < MIN_SUBSTANTIVE_MESSAGES) return null;

  return distillSession(db, sessionId, model, createChat)
    .then(() => {})
    .catch(() => {});
}
