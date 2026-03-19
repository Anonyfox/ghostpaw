import type { ChatMessage } from "../chat/api/read/index.ts";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_CONVERSATION_LENGTH = 40_000;

export function formatConversation(messages: ChatMessage[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    if (msg.isCompaction) continue;

    const label = msg.role === "user" ? "User" : "Agent";
    const text =
      msg.content.length > MAX_MESSAGE_LENGTH
        ? `${msg.content.slice(0, MAX_MESSAGE_LENGTH)} [...]`
        : msg.content;

    parts.push(`${label}: ${text}`);
  }

  const result = parts.join("\n\n");
  if (result.length > MAX_CONVERSATION_LENGTH) {
    return `${result.slice(0, MAX_CONVERSATION_LENGTH)}\n\n[conversation truncated]`;
  }
  return result;
}
