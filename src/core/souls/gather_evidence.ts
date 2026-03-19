import type { DatabaseHandle } from "../../lib/index.ts";
import { getDelegationStatsSince } from "../chat/api/read/index.ts";
import { countMemoriesMatchingText } from "../memory/api/read/index.ts";
import type { SoulRelevantSignal } from "../trail/api/read/index.ts";
import { listSoulRelevantSignals } from "../trail/api/read/index.ts";
import { countActiveTraits } from "./count_active_traits.ts";
import type { DelegationStats } from "./delegation_stats.ts";
import { getLevelHistory } from "./get_level_history.ts";
import { getSoulByName } from "./get_soul_by_name.ts";
import { listTraits } from "./list_traits.ts";
import { pendingShardsForSoul } from "./pending_shards_for_soul.ts";
import { queryCostTrend } from "./query_cost_trend.ts";
import { queryTraitFitness } from "./query_trait_fitness.ts";
import { queryWindowedStats } from "./query_windowed_stats.ts";
import type { LevelSnapshot, SoulEvidence } from "./soul_evidence_types.ts";
import { getTraitLimit } from "./trait_limit.ts";
import type { TraitSnapshot } from "./trait_snapshot.ts";

function queryDelegationStats(db: DatabaseHandle, soulId: number): DelegationStats {
  return getDelegationStatsSince(db, soulId, 0);
}

function queryRelatedMemoryCount(db: DatabaseHandle, soulName: string): number {
  return countMemoriesMatchingText(db, soulName);
}

function safeTrailSignals(db: DatabaseHandle): SoulRelevantSignal[] {
  try {
    return listSoulRelevantSignals(db, 10);
  } catch {
    return [];
  }
}

function toTraitSnapshot(t: {
  id: number;
  principle: string;
  provenance: string;
  generation: number;
  status: string;
  createdAt: number;
}): TraitSnapshot {
  return {
    id: t.id,
    principle: t.principle,
    provenance: t.provenance,
    generation: t.generation,
    status: t.status,
    createdAt: t.createdAt,
  };
}

export function gatherSoulEvidence(db: DatabaseHandle, soulName: string): SoulEvidence {
  const soul = getSoulByName(db, soulName);
  if (!soul) throw new Error(`Soul "${soulName}" not found.`);

  const soulId = soul.id;
  const traitLimit = getTraitLimit(db);
  const activeCount = countActiveTraits(db, soulId);
  const allTraits = listTraits(db, soulId);

  const activeTraits = allTraits.filter((t) => t.status === "active").map(toTraitSnapshot);
  const revertedTraits = allTraits.filter((t) => t.status === "reverted").map(toTraitSnapshot);
  const consolidatedTraits = allTraits
    .filter((t) => t.status === "consolidated")
    .map(toTraitSnapshot);
  const promotedTraits = allTraits.filter((t) => t.status === "promoted").map(toTraitSnapshot);

  const levels = getLevelHistory(db, soulId);
  const levelHistory: LevelSnapshot[] = levels.map((l) => ({
    level: l.level,
    createdAt: l.createdAt,
    traitsConsolidatedCount: l.traitsConsolidated.length,
    traitsPromotedCount: l.traitsPromoted.length,
    traitsCarriedCount: l.traitsCarried.length,
    traitsMergedCount: l.traitsMerged.length,
  }));

  const lastTraitChangeAt =
    activeTraits.length > 0 ? Math.max(...activeTraits.map((t) => t.createdAt)) : null;

  return {
    soulId,
    soulName: soul.name,
    level: soul.level,
    essence: soul.essence,
    description: soul.description,
    activeTraitCount: activeCount,
    traitLimit,
    atCapacity: activeCount >= traitLimit,
    delegationStats: queryDelegationStats(db, soulId),
    windowedStats: queryWindowedStats(db, soulId, lastTraitChangeAt),
    traitFitness: queryTraitFitness(db, soulId, activeTraits),
    costTrend: queryCostTrend(db, soulId),
    activeTraits,
    revertedTraits,
    consolidatedTraits,
    promotedTraits,
    levelHistory,
    relatedMemoryCount: queryRelatedMemoryCount(db, soulName),
    pendingShards: pendingShardsForSoul(db, soulId),
    trailSignals: safeTrailSignals(db),
  };
}
