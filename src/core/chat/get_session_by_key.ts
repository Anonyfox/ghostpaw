import type { DatabaseHandle } from "../../lib/index.ts";
import { isNullRow } from "../../lib/index.ts";
import { rowToSession } from "./row_to_session.ts";
import type { ChatSession } from "./types.ts";

export function getSessionByKey(db: DatabaseHandle, key: string): ChatSession | null {
  const row = db
    .prepare(
      "SELECT * FROM sessions WHERE key = ? AND closed_at IS NULL ORDER BY last_active_at DESC LIMIT 1",
    )
    .get(key) as Record<string, unknown> | undefined;
  return isNullRow(row) ? null : rowToSession(row);
}
