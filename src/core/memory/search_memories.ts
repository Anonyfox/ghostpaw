import type { DatabaseHandle } from "../../lib/index.ts";
import { bufferToVector } from "./buffer_to_vector.ts";
import { cosineSimilarity } from "./cosine_similarity.ts";
import { resolveMemoryConfig } from "./resolve_config.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { RankedMemory, SearchOptions } from "./types.ts";

/**
 * Approach E: SQL pre-ranks by `confidence * freshness` using native math
 * functions, then JS computes cosine similarity on the reduced candidate set.
 */
export function searchMemories(
  db: DatabaseHandle,
  query: number[],
  options?: SearchOptions,
): RankedMemory[] {
  const k = Math.max(1, Math.trunc(resolveMemoryConfig(db, "memory_recall_k", options?.k)));
  const minScore = Math.max(0, resolveMemoryConfig(db, "memory_min_score", options?.minScore));
  const halfLife = Math.max(
    1,
    resolveMemoryConfig(db, "memory_half_life_days", options?.halfLifeDays),
  );
  const multiplier = Math.max(
    1,
    Math.trunc(
      resolveMemoryConfig(db, "memory_candidate_pool_multiplier", options?.candidateMultiplier),
    ),
  );
  const candidateLimit = k * multiplier;
  const now = Date.now();
  const queryVec = new Float32Array(query);

  let sql = `
    SELECT *, confidence * exp(
      -(CAST(? AS REAL) - verified_at) / (86400000.0 * ? * sqrt(CAST(evidence_count AS REAL)))
    ) AS weight
    FROM memories
    WHERE superseded_by IS NULL AND embedding IS NOT NULL`;

  const params: unknown[] = [now, halfLife];

  if (options?.category) {
    sql += " AND category = ?";
    params.push(options.category);
  }

  sql += " ORDER BY weight DESC LIMIT ?";
  params.push(candidateLimit);

  const rows = db.prepare(sql).all(...params);

  const scored: RankedMemory[] = [];
  for (const row of rows) {
    const embeddingBlob = row.embedding as Uint8Array;
    const memVec = bufferToVector(embeddingBlob);
    const similarity = cosineSimilarity(queryVec, memVec);
    const weight = row.weight as number;
    const score = similarity * weight;

    if (score >= minScore) {
      const mem = rowToMemory(row);
      scored.push({ ...mem, score, similarity });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
