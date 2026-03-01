import type { SoulTrait, TraitStatus } from "./types.ts";

export function rowToTrait(row: Record<string, unknown>): SoulTrait {
  return {
    id: row.id as number,
    soulId: row.soul_id as number,
    principle: row.principle as string,
    provenance: row.provenance as string,
    generation: row.generation as number,
    status: row.status as TraitStatus,
    mergedInto: (row.merged_into as number | null) ?? null,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
