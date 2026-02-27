import type { DatabaseHandle } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { ftsSearch } from "./fts_search.ts";
import { resolveMemoryConfig } from "./resolve_config.ts";
import { scoreFtsHits } from "./score_fts_hits.ts";
import { searchMemories } from "./search_memories.ts";
import type { RankedMemory, RecallOptions } from "./types.ts";

const FTS_CANDIDATE_FACTOR = 5;

/**
 * Two-phase recall: Approach E vector search first, FTS5 fallback when
 * results are weak. Both phases produce the same score type so merged
 * results are directly comparable.
 */
export function recallMemories(
  db: DatabaseHandle,
  text: string,
  options?: RecallOptions,
): RankedMemory[] {
  const k = Math.max(1, Math.trunc(resolveMemoryConfig(db, "memory_recall_k", options?.k)));
  const threshold = resolveMemoryConfig(
    db,
    "memory_fallback_threshold",
    options?.fallbackThreshold,
  );
  const minResults = Math.max(
    0,
    resolveMemoryConfig(db, "memory_fallback_min_results", options?.fallbackMinResults),
  );

  const embedding = embedText(text);
  const phase1 = searchMemories(db, embedding, options);

  const satisfied =
    phase1.length >= minResults && phase1.length > 0 && phase1[0].score >= threshold;
  if (satisfied) return phase1;

  return mergeWithFtsResults(db, text, embedding, phase1, k, options);
}

function mergeWithFtsResults(
  db: DatabaseHandle,
  text: string,
  embedding: number[],
  phase1: RankedMemory[],
  k: number,
  options?: RecallOptions,
): RankedMemory[] {
  const halfLife = resolveMemoryConfig(db, "memory_half_life_days", options?.halfLifeDays);
  const minScore = resolveMemoryConfig(db, "memory_min_score", options?.minScore);
  const phase1Ids = phase1.map((m) => m.id);

  const ftsHits = ftsSearch(db, text, {
    limit: k * FTS_CANDIDATE_FACTOR,
    category: options?.category,
    excludeIds: phase1Ids,
  });
  if (ftsHits.length === 0) return phase1;

  const queryVec = new Float32Array(embedding);
  const phase2 = scoreFtsHits(ftsHits, queryVec, halfLife, minScore, Date.now());

  const merged = [...phase1, ...phase2];
  merged.sort((a, b) => b.score - a.score);

  const seen = new Set<number>();
  const deduped: RankedMemory[] = [];
  for (const m of merged) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      deduped.push(m);
    }
    if (deduped.length >= k) break;
  }

  return deduped;
}
