import type { Memory, MemoryCategory, MemorySource } from "./types.ts";

export function rowToMemory(row: Record<string, unknown>): Memory {
  return {
    id: row.id as number,
    claim: row.claim as string,
    confidence: row.confidence as number,
    evidenceCount: row.evidence_count as number,
    createdAt: row.created_at as number,
    verifiedAt: row.verified_at as number,
    source: row.source as MemorySource,
    category: row.category as MemoryCategory,
    supersededBy: (row.superseded_by as number | null) ?? null,
  };
}
