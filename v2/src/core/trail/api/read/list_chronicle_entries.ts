import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { TrailChronicle } from "../../internal/index.ts";
import { rowToChronicle } from "../../internal/index.ts";

export interface ListChronicleOptions {
  limit?: number;
  beforeId?: number;
}

export function listChronicleEntries(
  db: DatabaseHandle,
  opts?: ListChronicleOptions,
): TrailChronicle[] {
  const limit = opts?.limit ?? 20;
  if (opts?.beforeId) {
    const rows = db
      .prepare("SELECT * FROM trail_chronicle WHERE id < ? ORDER BY id DESC LIMIT ?")
      .all(opts.beforeId, limit) as Record<string, unknown>[];
    return rows.map(rowToChronicle);
  }
  const rows = db
    .prepare("SELECT * FROM trail_chronicle ORDER BY id DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToChronicle);
}
