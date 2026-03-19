import type { DatabaseHandle } from "../../lib/index.ts";
import { isNullRow } from "../../lib/index.ts";
import { rowToSession } from "./row_to_session.ts";
import type { ChatSession } from "./types.ts";

export function getSession(db: DatabaseHandle, id: number): ChatSession | null {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return isNullRow(row) ? null : rowToSession(row);
}
