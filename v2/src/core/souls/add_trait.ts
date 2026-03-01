import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { AddTraitInput, SoulTrait } from "./types.ts";

export function addTrait(db: DatabaseHandle, soulId: number, input: AddTraitInput): SoulTrait {
  const soul = getActiveSoul(db, soulId);
  if (typeof input.principle !== "string") {
    throw new Error("Trait principle must be a string.");
  }
  const principle = input.principle.trim();
  if (principle.length === 0) {
    throw new Error("Trait principle must not be empty.");
  }
  if (typeof input.provenance !== "string") {
    throw new Error("Trait provenance must be a string.");
  }
  const provenance = input.provenance.trim();
  if (provenance.length === 0) {
    throw new Error("Trait provenance must not be empty. No evidence, no trait.");
  }

  const now = Date.now();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(soulId, principle, provenance, soul.level, now, now);

  const row = db.prepare("SELECT * FROM soul_traits WHERE id = ?").get(lastInsertRowid);
  return rowToTrait(row as Record<string, unknown>);
}
