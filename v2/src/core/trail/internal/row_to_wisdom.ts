import type { PairingWisdom, WisdomCategory } from "./types.ts";

export function rowToWisdom(row: Record<string, unknown>): PairingWisdom {
  return {
    id: row.id as number,
    category: row.category as WisdomCategory,
    pattern: row.pattern as string,
    guidance: row.guidance as string,
    evidenceCount: row.evidence_count as number,
    confidence: row.confidence as number,
    hitCount: row.hit_count as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
