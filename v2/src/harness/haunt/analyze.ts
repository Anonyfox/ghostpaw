import type { HauntSummary } from "../../core/haunt/index.ts";
import { listHaunts } from "../../core/haunt/index.ts";
import { getRecentSeededMemoryIds } from "../../core/haunt/list_haunts.ts";
import type { Memory, MemoryCategory, MemorySource } from "../../core/memory/index.ts";
import { staleMemories } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { selectSeed } from "./seeds.ts";
import type { HauntAnalysis, NoveltyInfo } from "./types.ts";

const RECENT_HAUNTS_LIMIT = 5;
const MEMORIES_PER_CATEGORY = 2;
const MIN_CONFIDENCE = 0.3;
const STALE_SUPPLEMENT = 2;
const SEEDED_EXCLUSION_LOOKBACK = 3;

const STOPWORDS = new Set([
  "about", "after", "also", "and", "are", "been", "before", "but", "can",
  "could", "does", "during", "each", "explored", "for", "found", "from",
  "had", "has", "have", "her", "his", "how", "into", "its", "looked",
  "may", "more", "new", "not", "now", "one", "our", "own", "some", "than",
  "that", "the", "their", "them", "then", "there", "these", "they", "this",
  "through", "too", "use", "was", "were", "what", "when", "which", "while",
  "who", "will", "with", "would", "you", "your",
]);

export function analyzeHauntContext(db: DatabaseHandle): HauntAnalysis {
  const recentHaunts = listHaunts(db, RECENT_HAUNTS_LIMIT);
  const hauntCount = recentHaunts.length;
  const recentTopicCluster = detectTopicCluster(recentHaunts);
  const coveredTopics = extractCoveredTopics(recentHaunts);
  const recentlySeeded = getRecentSeededMemoryIds(db, SEEDED_EXCLUSION_LOOKBACK);
  const seedMemories = sampleAntiRecencyMemories(db, recentTopicCluster, recentlySeeded);
  const novelty = detectNovelty(db, recentHaunts);
  const seed = selectSeed(db, recentTopicCluster, novelty);

  return { hauntCount, recentTopicCluster, coveredTopics, seed, seedMemories, recentHaunts, novelty };
}

export function detectTopicCluster(haunts: HauntSummary[]): string | null {
  if (haunts.length < 3) return null;

  const freq = new Map<string, number>();
  for (const h of haunts) {
    const words = new Set(
      h.summary
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
    );
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [word, count] of freq) {
    if (count >= 3 && count > bestCount) {
      best = word;
      bestCount = count;
    }
  }
  return best;
}

export function extractCoveredTopics(haunts: HauntSummary[], maxTopics = 5): string[] {
  if (haunts.length === 0) return [];

  const freq = new Map<string, number>();
  for (const h of haunts) {
    const words = new Set(
      h.summary
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
    );
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTopics)
    .map(([word]) => word);
}

export function sampleAntiRecencyMemories(
  db: DatabaseHandle,
  recentTopicCluster: string | null,
  excludeIds: Set<number> = new Set(),
): Memory[] {
  const categories = ["preference", "fact", "procedure", "capability", "custom"] as const;
  const seen = new Set<number>(excludeIds);
  const sampled: Memory[] = [];

  for (const cat of categories) {
    const extra = excludeIds.size > 0 ? excludeIds.size : 0;
    let memories = queryRandomMemories(
      db, cat, MEMORIES_PER_CATEGORY + extra, MIN_CONFIDENCE, recentTopicCluster,
    );
    if (memories.length === 0 && recentTopicCluster) {
      memories = queryRandomMemories(db, cat, MEMORIES_PER_CATEGORY + extra, MIN_CONFIDENCE, null);
    }
    let added = 0;
    for (const m of memories) {
      if (added >= MEMORIES_PER_CATEGORY) break;
      if (!seen.has(m.id)) {
        seen.add(m.id);
        sampled.push(m);
        added++;
      }
    }
  }

  let staleAdded = 0;
  const stale = staleMemories(db, STALE_SUPPLEMENT * 3);
  for (const m of stale) {
    if (staleAdded >= STALE_SUPPLEMENT) break;
    if (seen.has(m.id)) continue;
    if (recentTopicCluster && m.claim.toLowerCase().includes(recentTopicCluster.toLowerCase())) {
      continue;
    }
    seen.add(m.id);
    sampled.push(m);
    staleAdded++;
  }

  return sampled;
}

function detectNovelty(db: DatabaseHandle, recentHaunts: HauntSummary[]): NoveltyInfo {
  const lastHauntTime = recentHaunts.length > 0 ? recentHaunts[0].createdAt : null;
  const timeSinceLastHaunt = lastHauntTime ? Date.now() - lastHauntTime : null;

  if (!lastHauntTime) {
    return { newMemories: [], revisedMemories: [], timeSinceLastHaunt: null };
  }

  const newRows = db
    .prepare(
      `SELECT id, claim FROM memories
       WHERE superseded_by IS NULL AND created_at > ?
       ORDER BY created_at DESC LIMIT 3`,
    )
    .all(lastHauntTime) as Array<{ id: number; claim: string }>;

  const revisedRows = db
    .prepare(
      `SELECT id, claim FROM memories
       WHERE superseded_by IS NULL AND verified_at > ? AND created_at <= ?
       ORDER BY verified_at DESC LIMIT 3`,
    )
    .all(lastHauntTime, lastHauntTime) as Array<{ id: number; claim: string }>;

  return {
    newMemories: newRows,
    revisedMemories: revisedRows,
    timeSinceLastHaunt,
  };
}

function queryRandomMemories(
  db: DatabaseHandle,
  category: string,
  limit: number,
  minConfidence: number,
  excludeTopic: string | null,
): Memory[] {
  const clauses = ["superseded_by IS NULL", "category = ?", "confidence >= ?"];
  const params: unknown[] = [category, minConfidence];

  if (excludeTopic) {
    clauses.push("LOWER(claim) NOT LIKE ?");
    params.push(`%${excludeTopic.toLowerCase()}%`);
  }

  const sql = `SELECT * FROM memories WHERE ${clauses.join(" AND ")} ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToMemory);
}

function rowToMemory(row: Record<string, unknown>): Memory {
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
