import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { getTrait } from "./get_trait.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { SoulTrait } from "./types.ts";

export function reactivateTrait(db: DatabaseHandle, traitId: number): SoulTrait {
  const existing = getTrait(db, traitId);
  if (!existing) {
    throw new Error(`Trait #${traitId} not found.`);
  }
  getActiveSoul(db, existing.soulId);
  if (existing.status === "active") {
    throw new Error(`Trait #${traitId} is already active.`);
  }

  const now = Date.now();
  db.prepare(
    "UPDATE soul_traits SET status = 'active', merged_into = NULL, updated_at = ? WHERE id = ?",
  ).run(now, traitId);

  const row = db.prepare("SELECT * FROM soul_traits WHERE id = ?").get(traitId);
  return rowToTrait(row as Record<string, unknown>);
}
