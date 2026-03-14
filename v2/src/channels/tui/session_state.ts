import { getHistory, listSessions } from "../../core/chat/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export interface TuiChatLine {
  role: "user" | "assistant";
  content: string;
}

export function getExistingTuiSession(db: DatabaseHandle) {
  return listSessions(db, { purpose: "chat", keyPrefix: "tui:", open: true, limit: 1 })[0] ?? null;
}

export function loadTuiMessages(db: DatabaseHandle, sessionId: number): TuiChatLine[] {
  const loaded: TuiChatLine[] = [];
  for (const message of getHistory(db, sessionId)) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    loaded.push({
      role: message.role,
      content: message.content,
    });
  }
  return loaded;
}
