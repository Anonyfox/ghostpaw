import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { getTrait } from "./get_trait.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { ReviseTraitInput, SoulTrait } from "./types.ts";

export function reviseTrait(
  db: DatabaseHandle,
  traitId: number,
  input: ReviseTraitInput,
): SoulTrait {
  if (input.principle == null && input.provenance == null) {
    throw new Error("At least one of principle or provenance must be provided.");
  }
  const existing = getTrait(db, traitId);
  if (!existing) {
    throw new Error(`Trait #${traitId} not found.`);
  }
  getActiveSoul(db, existing.soulId);
  if (existing.status !== "active") {
    throw new Error(
      `Trait #${traitId} is ${existing.status} and cannot be revised. Only active traits can be revised.`,
    );
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (input.principle != null) {
    if (typeof input.principle !== "string") {
      throw new Error("Trait principle must be a string.");
    }
    const trimmed = input.principle.trim();
    if (trimmed.length === 0) {
      throw new Error("Trait principle must not be empty.");
    }
    sets.push("principle = ?");
    params.push(trimmed);
  }
  if (input.provenance != null) {
    if (typeof input.provenance !== "string") {
      throw new Error("Trait provenance must be a string.");
    }
    const trimmed = input.provenance.trim();
    if (trimmed.length === 0) {
      throw new Error("Trait provenance must not be empty. No evidence, no trait.");
    }
    sets.push("provenance = ?");
    params.push(trimmed);
  }

  const now = Date.now();
  sets.push("updated_at = ?");
  params.push(now);
  params.push(traitId);

  db.prepare(`UPDATE soul_traits SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare("SELECT * FROM soul_traits WHERE id = ?").get(traitId);
  return rowToTrait(row as Record<string, unknown>);
}
