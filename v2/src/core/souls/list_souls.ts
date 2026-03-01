import type { DatabaseHandle } from "../../lib/index.ts";
import type { SoulSummary } from "./types.ts";

export function listSouls(db: DatabaseHandle): SoulSummary[] {
  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.description, s.level, s.updated_at,
              (SELECT COUNT(*) FROM soul_traits t WHERE t.soul_id = s.id AND t.status = 'active') AS active_trait_count
       FROM souls s
       WHERE s.deleted_at IS NULL
       ORDER BY s.created_at`,
    )
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    name: row.name as string,
    description: (row.description as string) ?? "",
    level: row.level as number,
    activeTraitCount: row.active_trait_count as number,
    updatedAt: row.updated_at as number,
  }));
}
