import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSession } from "./row_to_session.ts";
import type { ChatSession } from "./types.ts";

export function sessionsSince(db: DatabaseHandle, sinceMs: number): ChatSession[] {
  const rows = db
    .prepare("SELECT * FROM sessions WHERE last_active_at >= ? ORDER BY last_active_at DESC")
    .all(sinceMs) as Record<string, unknown>[];
  return rows.map(rowToSession);
}
