import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

const DEPTH_TRUST_THRESHOLD = 0.6;

export interface DepthQuestion {
  loop: OpenLoop;
  tier: string;
}

/**
 * Returns curiosity-category open loops eligible for deeper relationship
 * questions. Depth-tier questions require the user's trust level in pack
 * to be at or above the "solid" threshold (0.6). Starter-tier questions
 * are always eligible. Returns empty if trust is too low for depth.
 */
export function getEligibleDepthQuestions(
  db: DatabaseHandle,
  opts?: { limit?: number },
): DepthQuestion[] {
  const limit = opts?.limit ?? 5;
  const userTrust = getUserTrust(db);

  const rows = db
    .prepare(
      `SELECT ol.*, sq.tier
       FROM trail_open_loops ol
       JOIN trail_starter_questions sq ON sq.loop_id = ol.id
       WHERE ol.category = 'curiosity'
         AND ol.status = 'alive'
         AND ol.recommended_action = 'ask'
         AND sq.resolved_at IS NULL
       ORDER BY ol.significance DESC
       LIMIT ?`,
    )
    .all(limit) as (Record<string, unknown> & { tier: string })[];

  return rows
    .filter((r) => r.tier !== "depth" || userTrust >= DEPTH_TRUST_THRESHOLD)
    .map((r) => ({ loop: rowToOpenLoop(r), tier: r.tier as string }));
}

function getUserTrust(db: DatabaseHandle): number {
  try {
    const row = db
      .prepare("SELECT trust FROM pack_members WHERE is_user = 1 AND status != 'lost' LIMIT 1")
      .get() as { trust: number } | undefined;
    return row?.trust ?? 0;
  } catch {
    return 0;
  }
}
