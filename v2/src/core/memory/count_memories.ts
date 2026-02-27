import type { DatabaseHandle } from "../../lib/index.ts";

export function countMemories(db: DatabaseHandle): { active: number; total: number } {
  const totalRow = db.prepare("SELECT COUNT(*) AS cnt FROM memories").get() as Record<
    string,
    unknown
  >;
  const activeRow = db
    .prepare("SELECT COUNT(*) AS cnt FROM memories WHERE superseded_by IS NULL")
    .get() as Record<string, unknown>;
  return {
    active: activeRow.cnt as number,
    total: totalRow.cnt as number,
  };
}
