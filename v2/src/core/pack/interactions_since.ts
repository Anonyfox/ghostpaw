import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToInteraction } from "./internal/rows/row_to_interaction.ts";
import type { PackInteraction } from "./types.ts";

export function interactionsSince(db: DatabaseHandle, sinceMs: number): PackInteraction[] {
  const rows = db
    .prepare("SELECT * FROM pack_interactions WHERE created_at >= ? ORDER BY created_at DESC")
    .all(sinceMs) as Record<string, unknown>[];
  return rows.map(rowToInteraction);
}
