import type { DatabaseHandle } from "../../lib/index.ts";

export interface TraitChange {
  soulId: number;
  traitId: number;
  principle: string;
  status: string;
  updatedAt: number;
}

export interface LevelChange {
  soulId: number;
  level: number;
  createdAt: number;
}

export interface SoulChanges {
  traits: TraitChange[];
  levels: LevelChange[];
}

export function traitChangesSince(db: DatabaseHandle, sinceMs: number): SoulChanges {
  const traitRows = db
    .prepare(
      "SELECT soul_id, id, principle, status, updated_at FROM soul_traits WHERE updated_at >= ? ORDER BY updated_at DESC",
    )
    .all(sinceMs) as Record<string, unknown>[];

  const levelRows = db
    .prepare(
      "SELECT soul_id, level, created_at FROM soul_levels WHERE created_at >= ? ORDER BY created_at DESC",
    )
    .all(sinceMs) as Record<string, unknown>[];

  return {
    traits: traitRows.map((r) => ({
      soulId: r.soul_id as number,
      traitId: r.id as number,
      principle: r.principle as string,
      status: r.status as string,
      updatedAt: r.updated_at as number,
    })),
    levels: levelRows.map((r) => ({
      soulId: r.soul_id as number,
      level: r.level as number,
      createdAt: r.created_at as number,
    })),
  };
}
