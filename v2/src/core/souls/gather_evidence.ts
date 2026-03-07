import type { DatabaseHandle } from "../../lib/index.ts";
import { countActiveTraits } from "./count_active_traits.ts";
import { getLevelHistory } from "./get_level_history.ts";
import { getSoulByName } from "./get_soul_by_name.ts";
import { listTraits } from "./list_traits.ts";
import { getTraitLimit } from "./trait_limit.ts";

export interface DelegationStats {
  total: number;
  completed: number;
  failed: number;
  avgCostUsd: number;
  totalCostUsd: number;
  totalTokensIn: number;
  totalTokensOut: number;
}

export interface TraitSnapshot {
  id: number;
  principle: string;
  provenance: string;
  generation: number;
  status: string;
  createdAt: number;
}

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
  activeTraits: TraitSnapshot[];
  revertedTraits: TraitSnapshot[];
  consolidatedTraits: TraitSnapshot[];
  promotedTraits: TraitSnapshot[];
  levelHistory: LevelSnapshot[];
  relatedMemoryCount: number;
}

function queryDelegationStats(db: DatabaseHandle, soulId: number): DelegationStats {
  const row = db
    .prepare(
      `SELECT
        COUNT(*)                                                          AS total,
        SUM(CASE WHEN closed_at IS NOT NULL AND error IS NULL THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END)                       AS failed,
        COALESCE(AVG(cost_usd), 0)                                        AS avg_cost,
        COALESCE(SUM(cost_usd), 0)                                        AS total_cost,
        COALESCE(SUM(tokens_in), 0)                                       AS total_in,
        COALESCE(SUM(tokens_out), 0)                                      AS total_out
      FROM sessions
      WHERE purpose = 'delegate' AND soul_id = ?`,
    )
    .get(soulId) as Record<string, number>;

  return {
    total: row.total,
    completed: row.completed,
    failed: row.failed,
    avgCostUsd: row.avg_cost,
    totalCostUsd: row.total_cost,
    totalTokensIn: row.total_in,
    totalTokensOut: row.total_out,
  };
}

function queryRelatedMemoryCount(db: DatabaseHandle, soulName: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM memories
       WHERE superseded_by IS NULL
         AND (claim LIKE ? OR source LIKE ?)`,
    )
    .get(`%${soulName}%`, `%${soulName}%`) as { cnt: number };
  return row.cnt;
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
    activeTraits,
    revertedTraits,
    consolidatedTraits,
    promotedTraits,
    levelHistory,
    relatedMemoryCount: queryRelatedMemoryCount(db, soulName),
  };
}
