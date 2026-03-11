import type { MemoryCategory, MemorySource } from "../../core/memory/api/types.ts";

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
