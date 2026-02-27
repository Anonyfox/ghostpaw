import type { Memory, RankedMemory } from "../../core/memory/index.ts";
import type { FormattedMemory } from "./types.ts";

type Strength = "strong" | "fading" | "faint";

function strengthLabel(confidence: number): Strength {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.4) return "fading";
  return "faint";
}

function relativeTime(timestamp: number, now: number): string {
  const ms = now - timestamp;
  if (ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function formatMemoryForAgent(
  mem: Memory | RankedMemory,
  now: number = Date.now(),
): FormattedMemory {
  const base: FormattedMemory = {
    id: mem.id,
    claim: mem.claim,
    strength: strengthLabel(mem.confidence),
    confidence: Math.round(mem.confidence * 100) / 100,
    evidence: mem.evidenceCount,
    source: mem.source,
    category: mem.category,
    last_verified: relativeTime(mem.verifiedAt, now),
  };
  if ("similarity" in mem) {
    base.similarity = Math.round(mem.similarity * 100) / 100;
  }
  return base;
}
