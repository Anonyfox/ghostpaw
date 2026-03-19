import type { Howl } from "../../core/chat/api/read/howls/index.ts";
import { getFullHistory } from "../../core/chat/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

const MAX_CONTEXT_MESSAGES = 6;

export function formatHowlOriginContext(db: DatabaseHandle, howl: Howl): string {
  const messages = getFullHistory(db, howl.originSessionId).filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
  if (messages.length === 0) return "Origin context: (none)";

  const anchorIndex =
    howl.originMessageId == null
      ? messages.length - 1
      : messages.findIndex((message) => message.id === howl.originMessageId);

  const end = anchorIndex === -1 ? messages.length : anchorIndex + 1;
  const start = Math.max(0, end - MAX_CONTEXT_MESSAGES);
  const window = messages.slice(start, end);

  const lines = window.map((message) => {
    const speaker = message.role === "user" ? "User" : "Ghostpaw";
    return `${speaker}: ${message.content}`;
  });

  return `Origin context:\n${lines.join("\n\n")}`;
}
