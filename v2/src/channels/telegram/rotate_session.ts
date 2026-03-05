import { addMessage, closeSession, getHistory, getOrCreateSession } from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

/**
 * Transparently rotates a Telegram session that has hit its token budget.
 * Closes the old session, creates a fresh one with the same key, and bridges
 * context by seeding the new session with the old session's compaction summary
 * (if one exists). Long-term memories persist independently of sessions, so
 * the agent retains knowledge even without a bridge summary.
 *
 * Returns the new session ID.
 */
export function rotateSession(
  db: DatabaseHandle,
  oldSessionId: number,
  sessionKey: string,
): number {
  const history = getHistory(db, oldSessionId);

  let bridgeSummary: string | null = null;
  if (history.length > 0 && history[0]!.isCompaction) {
    bridgeSummary = history[0]!.content;
  }

  closeSession(db, oldSessionId);

  const newSession = getOrCreateSession(db, sessionKey, { purpose: "chat" });

  if (bridgeSummary) {
    addMessage(db, {
      sessionId: newSession.id,
      role: "assistant",
      content: bridgeSummary,
      isCompaction: true,
    });
  }

  return newSession.id;
}
