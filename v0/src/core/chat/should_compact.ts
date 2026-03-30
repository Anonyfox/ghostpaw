import type { Message } from "chatoyant";
import { estimateTokens } from "chatoyant/tokens";

export function shouldCompact(history: Message[], threshold: number): boolean {
  if (threshold <= 0) return false;
  if (history.length === 0) return false;

  let total = 0;
  for (const msg of history) {
    if (msg.role === "user" || msg.role === "assistant") {
      total += estimateTokens(msg.content ?? "");
    }
  }
  return total > threshold;
}
