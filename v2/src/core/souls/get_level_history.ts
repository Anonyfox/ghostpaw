import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToLevel } from "./row_to_level.ts";
import type { SoulLevel } from "./types.ts";

export function getLevelHistory(db: DatabaseHandle, soulId: number): SoulLevel[] {
  const rows = db
    .prepare("SELECT * FROM soul_levels WHERE soul_id = ? ORDER BY level ASC")
    .all(soulId) as Record<string, unknown>[];
  return rows.map(rowToLevel);
}
