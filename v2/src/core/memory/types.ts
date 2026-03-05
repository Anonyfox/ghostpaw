export const MEMORY_SOURCES = ["explicit", "observed", "distilled", "inferred"] as const;
export type MemorySource = (typeof MEMORY_SOURCES)[number];

export const MEMORY_CATEGORIES = [
  "preference",
  "fact",
  "procedure",
  "capability",
  "custom",
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface Memory {
  id: number;
  claim: string;
  confidence: number;
  evidenceCount: number;
  createdAt: number;
  verifiedAt: number;
  source: MemorySource;
  category: MemoryCategory;
  supersededBy: number | null;
}

export interface RankedMemory extends Memory {
  score: number;
  similarity: number;
}

export interface StoreOptions {
  source?: MemorySource;
  category?: MemoryCategory;
  confidence?: number;
}

export interface SearchOptions {
  k?: number;
  minScore?: number;
  category?: MemoryCategory;
  halfLifeDays?: number;
  candidateMultiplier?: number;
}

export interface RecallOptions extends SearchOptions {
  fallbackThreshold?: number;
  fallbackMinResults?: number;
}

export interface FtsHit {
  id: number;
  claim: string;
  embedding: Uint8Array;
  confidence: number;
  evidenceCount: number;
  createdAt: number;
  verifiedAt: number;
  source: MemorySource;
  category: MemoryCategory;
}

export interface ListOptions {
  category?: MemoryCategory;
  minConfidence?: number;
  includeSuperseded?: boolean;
  limit?: number;
  offset?: number;
}
