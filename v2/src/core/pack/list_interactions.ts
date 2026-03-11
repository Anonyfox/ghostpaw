import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToInteraction } from "./internal/rows/row_to_interaction.ts";
import type { ListInteractionsOptions, PackInteraction } from "./types.ts";

export function listInteractions(
  db: DatabaseHandle,
  memberId: number,
  options: ListInteractionsOptions = {},
): PackInteraction[] {
  const conditions: string[] = ["member_id = ?"];
  const params: unknown[] = [memberId];

  if (options.kind) {
    conditions.push("kind = ?");
    params.push(options.kind);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const rows = db
    .prepare(`SELECT * FROM pack_interactions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Record<string, unknown>[];

  return rows.map(rowToInteraction);
}
