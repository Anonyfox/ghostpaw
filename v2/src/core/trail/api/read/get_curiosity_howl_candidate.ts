import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

export interface CuriosityHowlCandidate {
  loop: OpenLoop;
  question: string;
}

/**
 * Returns the single highest-significance curiosity loop eligible for
 * howl delivery. A loop is eligible when it has status "alive",
 * recommended_action "ask", and its earliest_resurface window (if set)
 * has passed. Returns null if no candidate qualifies.
 */
export function getCuriosityHowlCandidate(db: DatabaseHandle): CuriosityHowlCandidate | null {
  const now = Date.now();
  const row = db
    .prepare(
      `SELECT * FROM trail_open_loops
       WHERE category = 'curiosity'
         AND status = 'alive'
         AND recommended_action = 'ask'
         AND (earliest_resurface IS NULL OR earliest_resurface <= ?)
       ORDER BY significance DESC
       LIMIT 1`,
    )
    .get(now) as Record<string, unknown> | undefined;
  if (!row) return null;
  const loop = rowToOpenLoop(row);
  return { loop, question: loop.description };
}
