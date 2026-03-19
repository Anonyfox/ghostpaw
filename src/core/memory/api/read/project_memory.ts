import { freshness } from "../../freshness.ts";
import type { Memory, RankedMemory } from "../../types.ts";

export type MemoryStrength = "strong" | "fading" | "faint";

export interface ProjectedMemory extends Memory {
  strength: MemoryStrength;
  freshness: number;
}

export interface ProjectedRankedMemory extends RankedMemory {
  strength: MemoryStrength;
  freshness: number;
}

export function memoryStrength(confidence: number): MemoryStrength {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.4) return "fading";
  return "faint";
}

export function projectMemory(memory: Memory, now: number = Date.now()): ProjectedMemory {
  return {
    ...memory,
    strength: memoryStrength(memory.confidence),
    freshness: freshness(memory.verifiedAt, memory.evidenceCount, now),
  };
}

export function projectRankedMemory(
  memory: RankedMemory,
  now: number = Date.now(),
): ProjectedRankedMemory {
  return {
    ...memory,
    strength: memoryStrength(memory.confidence),
    freshness: freshness(memory.verifiedAt, memory.evidenceCount, now),
  };
}
