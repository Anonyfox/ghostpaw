export type MemorySource = "explicit" | "observed" | "distilled" | "inferred";
export type MemoryCategory = "preference" | "fact" | "procedure" | "capability" | "custom";
export type MemoryStrength = "strong" | "fading" | "faint";

export interface MemoryInfo {
  id: number;
  claim: string;
  confidence: number;
  evidenceCount: number;
  createdAt: number;
  verifiedAt: number;
  source: MemorySource;
  category: MemoryCategory;
  supersededBy: number | null;
  strength: MemoryStrength;
  freshness: number;
}

export interface MemorySearchResult extends MemoryInfo {
  score: number;
  similarity: number;
}

export interface MemoryStatsResponse {
  active: number;
  total: number;
  strong: number;
  fading: number;
  faint: number;
  stale: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  avgEvidence: number;
  singleEvidence: number;
  recentRevisions: number;
}

export interface MemoryListResponse {
  memories: MemoryInfo[];
  total: number;
}

export interface MemorySearchResponse {
  memories: MemorySearchResult[];
}

export interface MemoryDetailResponse extends MemoryInfo {
  supersedes: number | null;
}

export interface MemoryCommandResponse {
  response: string;
  cost: number;
  sessionId: number;
  acted: boolean;
}
