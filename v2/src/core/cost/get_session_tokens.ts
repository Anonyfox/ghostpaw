import type { DatabaseHandle } from "../../lib/index.ts";

export function getSessionTokens(db: DatabaseHandle, sessionId: number): number {
  const row = db
    .prepare("SELECT tokens_in + tokens_out AS total FROM sessions WHERE id = ?")
    .get(sessionId) as { total: number } | undefined;
  return row?.total ?? 0;
}
