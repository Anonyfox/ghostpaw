import { getSessionByKey } from "../../core/chat/api/read/index.ts";
import { closeSession } from "../../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { sessionKeyForChat } from "./session_key.ts";

export interface HandleResetDeps {
  db: DatabaseHandle;
  isAllowed: (chatId: number) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<void>;
}

export async function handleReset(deps: HandleResetDeps, chatId: number): Promise<void> {
  if (!deps.isAllowed(chatId)) return;

  const sessionKey = sessionKeyForChat(chatId);
  const session = getSessionByKey(deps.db, sessionKey);

  if (session) {
    closeSession(deps.db, session.id);
    await deps.sendMessage(chatId, "Session reset. Starting fresh — memories are still intact.");
  } else {
    await deps.sendMessage(chatId, "No active session to reset.");
  }
}
