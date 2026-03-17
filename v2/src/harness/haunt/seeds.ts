import {
  fadingMemories,
  heavilyRevisedMemories,
  memoryCategoryConfidences,
  memoryCategoryCounts,
  memoryHealth,
  oldestMemory,
  randomUnconfirmedExplicitMemoryBefore,
  staleMemories,
} from "../../core/memory/api/read/index.ts";
import type { Memory } from "../../core/memory/api/types.ts";
import { sensePack } from "../../core/pack/api/read/index.ts";
import {
  computeQuestMarker,
  countQuestsByStatus,
  dueSoonQuests,
  getStreakInfo,
  listQuests,
  overdueQuests,
  staleQuests,
} from "../../core/quests/api/read/index.ts";
import { getHauntSeeds } from "../../core/trail/api/read/index.ts";
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

  const oldest = oldestMemory(db);
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

  const exploitSeeds = buildExploitationSeeds(db, stale);
  for (const es of exploitSeeds) {
    seeds.push(es);
  }

  const questSeeds = buildQuestSeeds(db);
  for (const qs of questSeeds) {
    seeds.push(qs);
  }

  try {
    const trailLoops = getHauntSeeds(db);
    for (const loop of trailLoops) {
      seeds.push({
        text: `An unresolved thread: "${truncateClaim(loop.description)}". Is this still alive?`,
        weight: loop.significance * 4,
      });
    }
  } catch {
    /* fail-open: trail tables may not exist yet */
  }

  return seeds;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function buildQuestSeeds(db: DatabaseHandle): SeedCandidate[] {
  const seeds: SeedCandidate[] = [];
  try {
    const overdue = overdueQuests(db, 1);
    if (overdue.length > 0) {
      const m = computeQuestMarker(overdue[0]);
      const prefix = m ? `${m.symbol} ` : "";
      seeds.push({
        text: `${prefix}Quest "${overdue[0].title}" is overdue. What's the situation?`,
        weight: 3,
      });
    }

    const upcoming = dueSoonQuests(db, THREE_DAYS_MS, 1);
    if (upcoming.length > 0) {
      const q = upcoming[0];
      const hoursLeft = Math.floor((q.dueAt! - Date.now()) / (60 * 60 * 1000));
      const timeLeft = hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft / 24)}d`;
      const m = computeQuestMarker(q);
      const prefix = m ? `${m.symbol} ` : "";
      seeds.push({
        text: `${prefix}Quest "${q.title}" is due in ${timeLeft}. What needs to happen?`,
        weight: 2.5,
      });
    }

    const stale = staleQuests(db, 1);
    if (stale.length > 0) {
      const m = computeQuestMarker(stale[0]);
      const prefix = m ? `${m.symbol} ` : "";
      seeds.push({
        text: `${prefix}"${stale[0].title}" has been active but untouched for over a week. Still relevant?`,
        weight: 2.5,
      });
    }

    const activeCount = countQuestsByStatus(db, "active");
    if (activeCount > 5) {
      seeds.push({
        text: `You have ${activeCount} active quests. Is anything stuck or obsolete?`,
        weight: 2,
      });
    }

    const offeredCount = countQuestsByStatus(db, "offered");
    if (offeredCount > 0) {
      seeds.push({
        text: `${offeredCount} quest${offeredCount > 1 ? "s" : ""} on the Quest Board. Any worth accepting or dismissing?`,
        weight: 2,
      });
    }

    const recurring = listQuests(db, {
      excludeStatuses: ["offered", "done", "failed", "abandoned"],
      limit: 10,
    }).filter((q) => q.rrule);
    for (const q of recurring) {
      const streak = getStreakInfo(db, q.id);
      if (streak?.atRisk && streak.currentStreak >= 5) {
        seeds.push({
          text: `Your "${q.title}" streak of ${streak.currentStreak} is at risk — due for completion soon.`,
          weight: 2.5,
        });
        break;
      }
    }
  } catch {
    // Quest tables may not exist yet
  }
  return seeds;
}

interface ImbalanceResult {
  dominant: { category: string; count: number };
  sparse: { category: string; count: number };
}

function detectCategoryImbalance(db: DatabaseHandle): ImbalanceResult | null {
  const counts = memoryCategoryCounts(db);
  if (counts.length < 2) return null;

  counts.sort((a, b) => b.count - a.count);
  const dominant = counts[0];
  const sparse = counts[counts.length - 1];
  if (dominant.count >= sparse.count * 3) {
    return { dominant, sparse };
  }
  return null;
}

function buildExploitationSeeds(db: DatabaseHandle, staleMemorySample: Memory[]): SeedCandidate[] {
  const seeds: SeedCandidate[] = [];

  try {
    const fading = fadingMemories(db, 1);
    if (fading.length > 0) {
      const claim = truncateClaim(fading[0].claim);
      seeds.push({
        text: `A belief is about to fade: "${claim}". Worth reinforcing or letting go?`,
        weight: 2.5,
      });
    }
  } catch {
    // Config table may not exist yet
  }

  try {
    const revised = heavilyRevisedMemories(db, 1);
    if (revised.length > 0) {
      seeds.push({
        text: `You've revised "${truncateClaim(revised[0].claim)}" ${revised[0].revisionDepth} times. Still settling or genuinely ambiguous?`,
        weight: 2,
      });
    }
  } catch {
    // Empty
  }

  try {
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    const unconfirmed = randomUnconfirmedExplicitMemoryBefore(db, sevenDaysAgo);
    if (unconfirmed) {
      seeds.push({
        text: `You were told "${truncateClaim(unconfirmed.claim)}" once but never encountered it again. Still accurate?`,
        weight: 1.5,
      });
    }
  } catch {
    // Empty
  }

  try {
    const health = memoryHealth(db);
    for (const [cat, count] of Object.entries(health.byCategory)) {
      if (count <= 3) continue;
      const confidence = memoryCategoryConfidences(db).find((entry) => entry.category === cat);
      if (confidence && confidence.avgConfidence < 0.5) {
        seeds.push({
          text: `Most of what you know about ${cat} is inferred, not confirmed. What would make it solid?`,
          weight: 2,
        });
        break;
      }
    }
  } catch {
    // Empty
  }

  try {
    const packMembers = sensePack(db);
    if (packMembers.length > 0 && staleMemorySample.length > 0) {
      const names = packMembers.map((m) => m.name.toLowerCase());
      for (const mem of staleMemorySample) {
        const lower = mem.claim.toLowerCase();
        const matched = packMembers.find((_, i) => lower.includes(names[i]));
        if (matched) {
          seeds.push({
            text: `Memory "${truncateClaim(mem.claim)}" mentions ${matched.name}, who's in your pack. How does this connect?`,
            weight: 2.5,
          });
          break;
        }
      }
    }
  } catch {
    // Pack tables may not exist yet
  }

  return seeds;
}

function truncateClaim(claim: string, maxLen = 80): string {
  if (claim.length <= maxLen) return claim;
  return `${claim.slice(0, maxLen - 3)}...`;
}
