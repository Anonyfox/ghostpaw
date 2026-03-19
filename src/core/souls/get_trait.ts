import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { SoulTrait } from "./types.ts";

export function getTrait(db: DatabaseHandle, traitId: number): SoulTrait | null {
  const row = db.prepare("SELECT * FROM soul_traits WHERE id = ?").get(traitId);
  if (!row) return null;
  return rowToTrait(row as Record<string, unknown>);
}
