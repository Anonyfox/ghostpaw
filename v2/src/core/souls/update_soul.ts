import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { Soul, UpdateSoulInput } from "./types.ts";

export function updateSoul(db: DatabaseHandle, id: number, input: UpdateSoulInput): Soul {
  if (input.name == null && input.essence == null && input.description == null) {
    throw new Error("At least one of name, essence, or description must be provided.");
  }
  getActiveSoul(db, id);

  const sets: string[] = [];
  const params: unknown[] = [];

  if (input.name != null) {
    if (typeof input.name !== "string") {
      throw new Error("Soul name must be a string.");
    }
    const trimmed = input.name.trim();
    if (trimmed.length === 0) {
      throw new Error("Soul name must not be empty.");
    }
    sets.push("name = ?");
    params.push(trimmed);
  }

  if (input.essence != null) {
    sets.push("essence = ?");
    params.push(input.essence);
  }

  if (input.description != null) {
    sets.push("description = ?");
    params.push(input.description);
  }

  const now = Date.now();
  sets.push("updated_at = ?");
  params.push(now);
  params.push(id);

  db.prepare(`UPDATE souls SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(id);
  return rowToSoul(row as Record<string, unknown>);
}
