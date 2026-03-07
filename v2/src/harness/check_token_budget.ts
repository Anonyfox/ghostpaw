import { getSessionTokens, getTokensInWindow } from "../core/chat/index.ts";
import { getConfig } from "../core/config/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { TokenBudgetError } from "../lib/index.ts";

export function checkTokenBudget(db: DatabaseHandle, sessionId: number): void {
  const sessionLimit = (getConfig(db, "max_tokens_per_session") as number | null) ?? 0;
  if (sessionLimit > 0) {
    const sessionTokens = getSessionTokens(db, sessionId);
    if (sessionTokens >= sessionLimit) {
      throw new TokenBudgetError("session", sessionTokens, sessionLimit);
    }
  }

  const dayLimit = (getConfig(db, "max_tokens_per_day") as number | null) ?? 0;
  if (dayLimit > 0) {
    const dayTokens = getTokensInWindow(db);
    if (dayTokens >= dayLimit) {
      throw new TokenBudgetError("day", dayTokens, dayLimit);
    }
  }
}
