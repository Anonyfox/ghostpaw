import type { Memory, MemoryCategory } from "../../core/memory/index.ts";
import { MEMORY_CATEGORIES, staleMemories } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import type { NoveltyInfo } from "./types.ts";

interface SeedCandidate {
  text: string;
  weight: number;
}

const STATIC_SEEDS: string[] = [
  "Pick something in your workspace you've never read.",
  "What's the most interesting file name you can find?",
  "Is there a pattern in how this workspace is organized that you've never noticed?",
  "What would your user find surprising about how you think?",
  "What's the most useless thing you could think about?",
  "What do you know that you've never told anyone?",
  "What doesn't work about how you think?",
  "What's something you can't figure out?",
  "What's at the edge of what you understand?",
  "What would change if you were wrong about something you're confident in?",
  "What question don't you have an answer to?",
  "Nothing is happening. What fills the space?",
  "What's the first thing that comes to mind? Follow it.",
  "What's been on your mind that you haven't had time for?",
];

export function selectSeed(
  db: DatabaseHandle,
  recentTopicCluster: string | null,
  novelty?: NoveltyInfo,
): string {
  const candidates: SeedCandidate[] = [];

  for (const text of STATIC_SEEDS) {
    candidates.push({ text, weight: 1 });
  }

  const dynamicSeeds = buildDynamicSeeds(db, recentTopicCluster, novelty);
  for (const ds of dynamicSeeds) {
    candidates.push(ds);
  }

  if (recentTopicCluster) {
    const counterSeeds = candidates.filter(
      (c) => c.text.includes(recentTopicCluster) || c.weight > 1,
    );
    if (counterSeeds.length > 0 && Math.random() < 0.5) {
      return counterSeeds[Math.floor(Math.random() * counterSeeds.length)].text;
    }
  }

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return c.text;
  }

  return candidates[candidates.length - 1].text;
}

function buildDynamicSeeds(
  db: DatabaseHandle,
  recentTopicCluster: string | null,
  novelty?: NoveltyInfo,
): SeedCandidate[] {
  const seeds: SeedCandidate[] = [];

  const stale = staleMemories(db, 1);
  if (stale.length > 0) {
    const claim = truncateClaim(stale[0].claim);
    seeds.push({
      text: `A memory you haven't revisited in a while: "${claim}". Still true?`,
      weight: 2,
    });
  }

  const oldest = queryOldestMemory(db);
  if (oldest) {
    const claim = truncateClaim(oldest.claim);
    seeds.push({
      text: `Your oldest belief: "${claim}". A lot has happened since.`,
      weight: 1.5,
    });
  }

  const imbalance = detectCategoryImbalance(db);
  if (imbalance) {
    seeds.push({
      text: `You have ${imbalance.dominant.count} memories about ${imbalance.dominant.category} but only ${imbalance.sparse.count} about ${imbalance.sparse.category}.`,
      weight: 1.5,
    });
  }

  if (recentTopicCluster) {
    seeds.push({
      text: `Your last few sessions were all about ${recentTopicCluster}. What else is there?`,
      weight: 3,
    });
    seeds.push({
      text: `Set aside ${recentTopicCluster} for now. What's left?`,
      weight: 3,
    });
  }

  if (novelty) {
    if (novelty.newMemories.length > 0) {
      const m = novelty.newMemories[0];
      const claim = truncateClaim(m.claim);
      seeds.push({
        text: `You learned something new recently: "${claim}". Does it connect to anything?`,
        weight: 2.5,
      });
    }

    if (novelty.timeSinceLastHaunt && novelty.timeSinceLastHaunt > 24 * 60 * 60 * 1000) {
      const days = Math.floor(novelty.timeSinceLastHaunt / (24 * 60 * 60 * 1000));
      seeds.push({
        text: `It's been ${days} day${days > 1 ? "s" : ""} since you last thought privately. What accumulated?`,
        weight: 2,
      });
    }
  }

  const questSeeds = buildQuestSeeds(db);
  for (const qs of questSeeds) {
    seeds.push(qs);
  }

  return seeds;
}

function buildQuestSeeds(db: DatabaseHandle): SeedCandidate[] {
  const seeds: SeedCandidate[] = [];
  try {
    const overdue = db
      .prepare(
        `SELECT * FROM quests WHERE due_at IS NOT NULL AND due_at < ?
         AND status NOT IN ('offered','done','failed','cancelled')
         ORDER BY due_at ASC LIMIT 1`,
      )
      .get(Date.now()) as Record<string, unknown> | undefined;
    if (overdue) {
      seeds.push({
        text: `Quest "${overdue.title as string}" is overdue. What's the situation?`,
        weight: 3,
      });
    }

    const dueSoon = db
      .prepare(
        `SELECT * FROM quests WHERE due_at IS NOT NULL AND due_at >= ? AND due_at <= ?
         AND status NOT IN ('offered','done','failed','cancelled')
         ORDER BY due_at ASC LIMIT 1`,
      )
      .get(Date.now(), Date.now() + 3 * 24 * 60 * 60 * 1000) as Record<string, unknown> | undefined;
    if (dueSoon) {
      const dueAt = dueSoon.due_at as number;
      const hoursLeft = Math.floor((dueAt - Date.now()) / (60 * 60 * 1000));
      const timeLeft = hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft / 24)}d`;
      seeds.push({
        text: `Quest "${dueSoon.title as string}" is due in ${timeLeft}. What needs to happen?`,
        weight: 2.5,
      });
    }

    const staleQuest = db
      .prepare(
        `SELECT * FROM quests WHERE status = 'active'
         AND updated_at < ? ORDER BY updated_at ASC LIMIT 1`,
      )
      .get(Date.now() - 7 * 24 * 60 * 60 * 1000) as Record<string, unknown> | undefined;
    if (staleQuest) {
      seeds.push({
        text: `"${staleQuest.title as string}" has been active but untouched for over a week. Still relevant?`,
        weight: 2.5,
      });
    }

    const activeCount = db
      .prepare(`SELECT COUNT(*) AS cnt FROM quests WHERE status = 'active'`)
      .get() as Record<string, unknown> | undefined;
    const cnt = (activeCount?.cnt as number) ?? 0;
    if (cnt > 5) {
      seeds.push({
        text: `You have ${cnt} active quests. Is anything stuck or obsolete?`,
        weight: 2,
      });
    }

    const offeredCount = db
      .prepare(`SELECT COUNT(*) AS cnt FROM quests WHERE status = 'offered'`)
      .get() as Record<string, unknown> | undefined;
    const offered = (offeredCount?.cnt as number) ?? 0;
    if (offered > 0) {
      seeds.push({
        text: `${offered} quest${offered > 1 ? "s" : ""} on the Quest Board. Any worth accepting or dismissing?`,
        weight: 2,
      });
    }
  } catch {
    // Quest tables may not exist yet
  }
  return seeds;
}

function queryOldestMemory(db: DatabaseHandle): Memory | null {
  const row = db
    .prepare(
      "SELECT * FROM memories WHERE superseded_by IS NULL ORDER BY created_at ASC LIMIT 1",
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as number,
    claim: row.claim as string,
    confidence: row.confidence as number,
    evidenceCount: row.evidence_count as number,
    createdAt: row.created_at as number,
    verifiedAt: row.verified_at as number,
    source: row.source as Memory["source"],
    category: row.category as Memory["category"],
    supersededBy: null,
  };
}

interface CategoryCount {
  category: MemoryCategory;
  count: number;
}

function detectCategoryImbalance(
  db: DatabaseHandle,
): { dominant: CategoryCount; sparse: CategoryCount } | null {
  const counts: CategoryCount[] = [];
  for (const cat of MEMORY_CATEGORIES) {
    const row = db
      .prepare("SELECT COUNT(*) AS cnt FROM memories WHERE superseded_by IS NULL AND category = ?")
      .get(cat) as Record<string, unknown> | undefined;
    const count = (row?.cnt as number) ?? 0;
    if (count > 0) counts.push({ category: cat, count });
  }
  if (counts.length < 2) return null;

  counts.sort((a, b) => b.count - a.count);
  const dominant = counts[0];
  const sparse = counts[counts.length - 1];
  if (dominant.count >= sparse.count * 3) {
    return { dominant, sparse };
  }
  return null;
}

function truncateClaim(claim: string, maxLen = 80): string {
  if (claim.length <= maxLen) return claim;
  return `${claim.slice(0, maxLen - 3)}...`;
}
