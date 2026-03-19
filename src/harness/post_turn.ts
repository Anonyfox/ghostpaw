import { getHistory, getSession } from "../core/chat/api/read/index.ts";
import type { ChatFactory } from "../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { generateSessionTitle } from "./oneshots/generate_title.ts";

/**
 * Returns a promise representing background work (title generation) if any was
 * started, or null if no work was needed. Callers that own the database
 * lifetime (CLI oneshot) must await this before closing; long-lived processes
 * (web, TUI) can ignore it.
 */
export function handlePostTurn(
  db: DatabaseHandle,
  sessionId: number,
  userMessage: string,
  model: string,
  createChat: ChatFactory,
  onTitleGenerated?: (title: string) => void,
): Promise<void> | null {
  const session = getSession(db, sessionId);
  if (!session) return null;
  if (session.displayName) return null;

  const history = getHistory(db, sessionId);
  const userMessages = history.filter((m) => m.role === "user");
  if (userMessages.length !== 1) return null;

  return (
    generateSessionTitle(db, sessionId, userMessage, model, createChat)
      .then((title) => {
        if (title && onTitleGenerated) onTitleGenerated(title);
      })
      // Title generation is best-effort — failure must not disrupt the user turn.
      .catch(() => {})
  );
}
