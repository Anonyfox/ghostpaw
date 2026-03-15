import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { LoopCategory, LoopStatus, OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

export interface ListOpenLoopsOptions {
  status?: LoopStatus;
  category?: LoopCategory;
  limit?: number;
}

export function listOpenLoops(db: DatabaseHandle, opts?: ListOpenLoopsOptions): OpenLoop[] {
  const status = opts?.status ?? "alive";
  const limit = opts?.limit ?? 7;
  if (opts?.category) {
    const rows = db
      .prepare(
        `SELECT * FROM trail_open_loops
         WHERE status = ? AND category = ?
         ORDER BY significance DESC LIMIT ?`,
      )
      .all(status, opts.category, limit) as Record<string, unknown>[];
    return rows.map(rowToOpenLoop);
  }
  const rows = db
    .prepare("SELECT * FROM trail_open_loops WHERE status = ? ORDER BY significance DESC LIMIT ?")
    .all(status, limit) as Record<string, unknown>[];
  return rows.map(rowToOpenLoop);
}
