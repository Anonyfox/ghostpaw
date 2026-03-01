import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToTrait } from "./row_to_trait.ts";
import type { ListTraitsOptions, SoulTrait } from "./types.ts";

export function listTraits(
  db: DatabaseHandle,
  soulId: number,
  options?: ListTraitsOptions,
): SoulTrait[] {
  const conditions = ["soul_id = ?"];
  const params: unknown[] = [soulId];

  if (options?.status !== undefined) {
    conditions.push("status = ?");
    params.push(options.status);
  }
  if (options?.generation !== undefined) {
    conditions.push("generation = ?");
    params.push(options.generation);
  }

  const where = conditions.join(" AND ");
  const rows = db
    .prepare(`SELECT * FROM soul_traits WHERE ${where} ORDER BY created_at`)
    .all(...params) as Record<string, unknown>[];

  return rows.map(rowToTrait);
}
