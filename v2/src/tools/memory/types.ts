import type { MemoryCategory, MemorySource } from "../../core/memory/index.ts";

export interface FormattedMemory {
  id: number;
  claim: string;
  strength: "strong" | "fading" | "faint";
  confidence: number;
  evidence: number;
  source: MemorySource;
  category: MemoryCategory;
  last_verified: string;
  similarity?: number;
}
