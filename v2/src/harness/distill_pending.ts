import { listDistillableSessionIds } from "../core/chat/api/read/index.ts";
import { type ChatFactory, deleteOldDistilled } from "../core/chat/api/write/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { DistillPendingResult, DistillToolCalls } from "./distill_types.ts";
import { ELIGIBLE_PURPOSES, MAX_SESSIONS_PER_SWEEP, STALE_THRESHOLD_MS } from "./distill_types.ts";
import { distillSession } from "./oneshots/distill_session.ts";

interface DistillPendingOptions {
  maxSessions?: number;
  staleThresholdMs?: number;
}

export async function distillPending(
  db: DatabaseHandle,
  createChat: ChatFactory,
  model: string,
  options?: DistillPendingOptions,
): Promise<DistillPendingResult> {
  const maxSessions = options?.maxSessions ?? MAX_SESSIONS_PER_SWEEP;
  const staleThresholdMs = options?.staleThresholdMs ?? STALE_THRESHOLD_MS;

  const ids = listDistillableSessionIds(db, {
    maxSessions,
    staleThresholdMs,
    eligiblePurposes: ELIGIBLE_PURPOSES,
  });

  const totals: DistillToolCalls = {};
  let processed = 0;
  let skipped = 0;

  for (const id of ids) {
    try {
      const result = await distillSession(db, id, model, createChat);
      if (result.skipped) {
        skipped++;
      } else {
        processed++;
        for (const [name, count] of Object.entries(result.toolCalls)) {
          totals[name] = (totals[name] ?? 0) + count;
        }
      }
    } catch {
      skipped++;
    }
  }

  if (processed > 0) {
    try {
      deleteOldDistilled(db);
    } catch {
      /* best-effort cleanup */
    }
  }

  return {
    sessionsProcessed: processed,
    sessionsSkipped: skipped,
    totalToolCalls: totals,
  };
}
