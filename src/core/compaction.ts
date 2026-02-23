import type { Message } from "./session.js";
import { estimateTokens } from "./cost.js";

const DEFAULT_KEEP_RECENT = 6;
const MIN_MESSAGES_FOR_COMPACTION = 8;

export function shouldCompact(messages: Message[], tokenLimit: number): boolean {
  if (messages.length < MIN_MESSAGES_FOR_COMPACTION) return false;
  return messages.reduce((sum, m) => sum + estimateTokens(m.content ?? ""), 0) > tokenLimit;
}

export function compactMessages(messages: Message[], keepRecentCount = DEFAULT_KEEP_RECENT): string {
  const splitIdx = Math.max(0, messages.length - keepRecentCount);
  const older = messages.slice(0, splitIdx);
  const recent = messages.slice(splitIdx);

  const parts: string[] = [
    "Summarize the following conversation into a concise summary that preserves " +
      "all important context, decisions, facts, and technical details. " +
      "The summary replaces the messages it covers, so include everything needed " +
      "for the conversation to continue coherently.",
  ];

  if (older.length > 0) {
    const existingCompaction = older.find((m) => m.isCompaction);
    if (existingCompaction?.content) {
      parts.push(`\n\nPrevious summary:\n${existingCompaction.content}`);
    }

    parts.push("\n\nMessages to summarize:");
    for (const msg of older) {
      if (msg.isCompaction) continue;
      parts.push(`\n[${msg.role}]: ${msg.content ?? "(no content)"}`);
    }
  }

  if (recent.length > 0) {
    parts.push("\n\nRecent messages (keep these as context, do NOT summarize them):");
    for (const msg of recent) {
      parts.push(`\n[${msg.role}]: ${msg.content ?? "(no content)"}`);
    }
  }

  return parts.join("");
}
