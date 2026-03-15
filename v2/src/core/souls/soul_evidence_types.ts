import type { SoulRelevantSignal } from "../trail/api/read/index.ts";
import type { DelegationStats } from "./delegation_stats.ts";
import type { CostTrend } from "./query_cost_trend.ts";
import type { TraitFitness } from "./query_trait_fitness.ts";
import type { WindowedStats } from "./query_windowed_stats.ts";
import type { SoulShard } from "./shard_types.ts";
import type { TraitSnapshot } from "./trait_snapshot.ts";

export interface LevelSnapshot {
  level: number;
  createdAt: number;
  traitsConsolidatedCount: number;
  traitsPromotedCount: number;
  traitsCarriedCount: number;
  traitsMergedCount: number;
}

export interface SoulEvidence {
  soulId: number;
  soulName: string;
  level: number;
  essence: string;
  description: string;
  activeTraitCount: number;
  traitLimit: number;
  atCapacity: boolean;
  delegationStats: DelegationStats;
  windowedStats: WindowedStats[];
  traitFitness: TraitFitness[];
  costTrend: CostTrend;
  activeTraits: TraitSnapshot[];
  revertedTraits: TraitSnapshot[];
  consolidatedTraits: TraitSnapshot[];
  promotedTraits: TraitSnapshot[];
  levelHistory: LevelSnapshot[];
  relatedMemoryCount: number;
  pendingShards: SoulShard[];
  trailSignals: SoulRelevantSignal[];
}
