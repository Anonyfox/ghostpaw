import type { ChatFactory } from "../core/chat/chat_instance.ts";
import type { ChatSession } from "../core/chat/index.ts";
import { countSubstantiveMessages, getSession } from "../core/chat/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
import { dropSoulshard } from "../core/souls/api/write/index.ts";
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

  if (session.purpose === "delegate" && session.soulId) {
    dropStructuralShard(db, sessionId, session);
  }

  if (!(ELIGIBLE_PURPOSES as readonly string[]).includes(session.purpose)) return null;
  if (session.distilledAt !== null) return null;

  const count = countSubstantiveMessages(db, sessionId);
  if (count < MIN_SUBSTANTIVE_MESSAGES) return null;

  return distillSession(db, sessionId, model, createChat)
    .then(() => {})
    .catch(() => {});
}

function dropStructuralShard(db: DatabaseHandle, sessionId: number, session: ChatSession): void {
  if (!session.soulId) return;

  const failed = !!session.error;
  const highCost = session.costUsd > 0.05;

  if (!failed && !highCost) return;

  const parts: string[] = [];
  if (failed) parts.push(`Delegation failed: ${session.error}`);
  if (highCost) parts.push(`High cost delegation: $${session.costUsd.toFixed(4)}`);
  const observation = parts.join(". ");

  const soulIds = [session.soulId];
  if (session.soulId !== MANDATORY_SOUL_IDS.ghostpaw) {
    soulIds.push(MANDATORY_SOUL_IDS.ghostpaw);
  }

  try {
    dropSoulshard(db, "delegation", String(sessionId), observation, soulIds);
  } catch {
    /* best-effort — don't break post-session flow */
  }
}
