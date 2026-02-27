import { bufferToVector } from "./buffer_to_vector.ts";
import { cosineSimilarity } from "./cosine_similarity.ts";
import { freshness } from "./freshness.ts";
import type { FtsHit, RankedMemory } from "./types.ts";

export function scoreFtsHits(
  hits: FtsHit[],
  queryVec: Float32Array,
  halfLife: number,
  minScore: number,
  now: number,
): RankedMemory[] {
  const results: RankedMemory[] = [];

  for (const hit of hits) {
    const memVec = bufferToVector(hit.embedding);
    const similarity = cosineSimilarity(queryVec, memVec);
    const fresh = freshness(hit.verifiedAt, hit.evidenceCount, now, halfLife);
    const score = similarity * hit.confidence * fresh;

    if (score >= minScore) {
      results.push({
        id: hit.id,
        claim: hit.claim,
        confidence: hit.confidence,
        evidenceCount: hit.evidenceCount,
        createdAt: hit.createdAt,
        verifiedAt: hit.verifiedAt,
        source: hit.source,
        category: hit.category,
        supersededBy: null,
        score,
        similarity,
      });
    }
  }

  return results;
}
