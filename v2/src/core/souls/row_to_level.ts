import type { SoulLevel } from "./types.ts";

export function rowToLevel(row: Record<string, unknown>): SoulLevel {
  return {
    id: row.id as number,
    soulId: row.soul_id as number,
    level: row.level as number,
    essenceBefore: row.essence_before as string,
    essenceAfter: row.essence_after as string,
    traitsConsolidated: JSON.parse(row.traits_consolidated as string) as number[],
    traitsPromoted: JSON.parse(row.traits_promoted as string) as number[],
    traitsCarried: JSON.parse(row.traits_carried as string) as number[],
    traitsMerged: JSON.parse(row.traits_merged as string) as number[],
    createdAt: row.created_at as number,
  };
}
