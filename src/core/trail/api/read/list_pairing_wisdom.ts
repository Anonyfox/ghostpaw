import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { PairingWisdom, WisdomCategory } from "../../internal/index.ts";
import { rowToWisdom } from "../../internal/index.ts";

export interface ListWisdomOptions {
  category?: WisdomCategory;
  minConfidence?: number;
  limit?: number;
}

export function listPairingWisdom(db: DatabaseHandle, opts?: ListWisdomOptions): PairingWisdom[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }
  if (opts?.minConfidence !== undefined) {
    conditions.push("confidence >= ?");
    params.push(opts.minConfidence);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 50;
  params.push(limit);

  const rows = db
    .prepare(`SELECT * FROM trail_pairing_wisdom ${where} ORDER BY confidence DESC LIMIT ?`)
    .all(...params) as Record<string, unknown>[];
  return rows.map(rowToWisdom);
}
