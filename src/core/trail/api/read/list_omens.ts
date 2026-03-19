import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Omen } from "../../internal/index.ts";
import { rowToOmen } from "../../internal/index.ts";

export interface ListOmensOptions {
  includeResolved?: boolean;
  limit?: number;
}

export function listOmens(db: DatabaseHandle, opts?: ListOmensOptions): Omen[] {
  const limit = opts?.limit ?? 20;
  if (opts?.includeResolved) {
    const rows = db
      .prepare("SELECT * FROM trail_omens ORDER BY created_at DESC LIMIT ?")
      .all(limit) as Record<string, unknown>[];
    return rows.map(rowToOmen);
  }
  const rows = db
    .prepare("SELECT * FROM trail_omens WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToOmen);
}
