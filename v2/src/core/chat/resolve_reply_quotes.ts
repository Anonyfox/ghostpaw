import type { DatabaseHandle } from "../../lib/index.ts";
import type { ChatMessage } from "./types.ts";

const MAX_QUOTE_LENGTH = 200;

export function resolveReplyQuotes(db: DatabaseHandle, history: ChatMessage[]): ChatMessage[] {
  const refsNeeded = new Set<number>();
  const historyIds = new Set(history.map((m) => m.id));

  for (const msg of history) {
    if (msg.replyToId !== null && !historyIds.has(msg.replyToId)) {
      refsNeeded.add(msg.replyToId);
    }
  }

  if (refsNeeded.size === 0) return history;

  const quotedContent = new Map<number, string>();
  for (const refId of refsNeeded) {
    const row = db.prepare("SELECT content FROM messages WHERE id = ?").get(refId) as
      | { content: string }
      | undefined;
    if (row) {
      quotedContent.set(refId, truncate(row.content, MAX_QUOTE_LENGTH));
    }
  }

  if (quotedContent.size === 0) return history;

  return history.map((msg) => {
    if (msg.replyToId === null || historyIds.has(msg.replyToId)) return msg;
    const quoted = quotedContent.get(msg.replyToId);
    if (!quoted) return msg;
    return { ...msg, content: `[Replying to: "${quoted}"]\n${msg.content}` };
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
