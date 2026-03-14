import type { ChatSession } from "../../core/chat/api/read/index.ts";
import { listSessions } from "../../core/chat/api/read/index.ts";
import {
  memoriesRevisedSince,
  memoriesSince,
  randomMemories,
  staleMemories,
} from "../../core/memory/api/read/index.ts";
import type { Memory } from "../../core/memory/api/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { selectSeed } from "./seeds.ts";
import type { HauntAnalysis, NoveltyInfo } from "./types.ts";

const RECENT_HAUNTS_LIMIT = 5;
const MEMORIES_PER_CATEGORY = 2;
const MIN_CONFIDENCE = 0.3;
const STALE_SUPPLEMENT = 2;

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "been",
  "before",
  "but",
  "can",
  "could",
  "does",
  "during",
  "each",
  "explored",
  "for",
  "found",
  "from",
  "had",
  "has",
  "have",
  "her",
  "his",
  "how",
  "into",
  "its",
  "looked",
  "may",
  "more",
  "new",
  "not",
  "now",
  "one",
  "our",
  "own",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "through",
  "too",
  "use",
  "was",
  "were",
  "what",
  "when",
  "which",
  "while",
  "who",
  "will",
  "with",
  "would",
  "you",
  "your",
]);

export function analyzeHauntContext(db: DatabaseHandle): HauntAnalysis {
  const recentHaunts = listSessions(db, { purpose: "haunt", limit: RECENT_HAUNTS_LIMIT });
  const hauntCount = recentHaunts.length;
  const recentTopicCluster = detectTopicCluster(recentHaunts);
  const coveredTopics = extractCoveredTopics(recentHaunts);
  const seedMemories = sampleAntiRecencyMemories(db, recentTopicCluster);
  const novelty = detectNovelty(db, recentHaunts);
  const seed = selectSeed(db, recentTopicCluster, novelty);

  return {
    hauntCount,
    recentTopicCluster,
    coveredTopics,
    seed,
    seedMemories,
    recentHaunts,
    novelty,
  };
}

function summaryText(session: ChatSession): string {
  return session.displayName ?? "";
}

export function detectTopicCluster(haunts: ChatSession[]): string | null {
  if (haunts.length < 3) return null;

  const freq = new Map<string, number>();
  for (const h of haunts) {
    const words = new Set(
      summaryText(h)
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

export function extractCoveredTopics(haunts: ChatSession[], maxTopics = 5): string[] {
  if (haunts.length === 0) return [];

  const freq = new Map<string, number>();
  for (const h of haunts) {
    const words = new Set(
      summaryText(h)
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
): Memory[] {
  const categories = ["preference", "fact", "procedure", "capability", "custom"] as const;
  const seen = new Set<number>();
  const sampled: Memory[] = [];

  for (const cat of categories) {
    let memories = randomMemories(db, {
      category: cat,
      limit: MEMORIES_PER_CATEGORY,
      minConfidence: MIN_CONFIDENCE,
      excludeTopic: recentTopicCluster,
    });
    if (memories.length === 0 && recentTopicCluster) {
      memories = randomMemories(db, {
        category: cat,
        limit: MEMORIES_PER_CATEGORY,
        minConfidence: MIN_CONFIDENCE,
      });
    }
    for (const m of memories) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        sampled.push(m);
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

function detectNovelty(db: DatabaseHandle, recentHaunts: ChatSession[]): NoveltyInfo {
  const lastHauntTime = recentHaunts.length > 0 ? recentHaunts[0].createdAt : null;
  const timeSinceLastHaunt = lastHauntTime ? Date.now() - lastHauntTime : null;

  if (!lastHauntTime) {
    return { newMemories: [], revisedMemories: [], timeSinceLastHaunt: null };
  }

  const newRows = memoriesSince(db, lastHauntTime, 3);
  const revisedRows = memoriesRevisedSince(db, lastHauntTime, 3);

  return {
    newMemories: newRows.map((m) => ({ id: m.id, claim: m.claim })),
    revisedMemories: revisedRows.map((m) => ({ id: m.id, claim: m.claim })),
    timeSinceLastHaunt,
  };
}
