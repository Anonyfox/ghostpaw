import type { Howl } from "../../core/chat/api/read/howls/index.ts";
import { getSession } from "../../core/chat/api/read/index.ts";
import { addMessage } from "../../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

export function appendOriginResolutionNote(db: DatabaseHandle, howl: Howl, note: string): void {
  const originSession = getSession(db, howl.originSessionId);
  if (!originSession) return;

  addMessage(db, {
    sessionId: howl.originSessionId,
    role: "assistant",
    content: note,
    parentId: originSession.headMessageId ?? undefined,
  });
}
