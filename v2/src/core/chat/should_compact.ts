import { estimateTokens } from "./estimate_tokens.ts";
import type { ChatMessage } from "./types.ts";

export function shouldCompact(history: ChatMessage[], threshold: number): boolean {
  if (threshold <= 0) return false;
  if (history.length === 0) return false;

  let total = 0;
  for (const msg of history) {
    total += estimateTokens(msg.content);
  }
  return total > threshold;
}
