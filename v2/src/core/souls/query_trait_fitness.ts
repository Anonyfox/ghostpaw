import type { DatabaseHandle } from "../../lib/index.ts";
import type { DelegationStats } from "./delegation_stats.ts";
import { queryStatsSince } from "./query_stats_since.ts";
import type { TraitSnapshot } from "./trait_snapshot.ts";

export interface TraitFitness {
  traitId: number;
  principle: string;
  addedAt: number;
  statsSinceAdded: DelegationStats;
}

export function queryTraitFitness(
  db: DatabaseHandle,
  soulId: number,
  activeTraits: TraitSnapshot[],
): TraitFitness[] {
  return activeTraits.map((t) => ({
    traitId: t.id,
    principle: t.principle,
    addedAt: t.createdAt,
    statsSinceAdded: queryStatsSince(db, soulId, t.createdAt),
  }));
}
