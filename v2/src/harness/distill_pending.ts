import type { ChatFactory } from "../core/chat/chat_instance.ts";
import { deleteOldDistilled, listDistillableSessionIds } from "../core/chat/index.ts";
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

  const totals: DistillToolCalls = { recall: 0, remember: 0, revise: 0, forget: 0 };
  let processed = 0;
  let skipped = 0;

  for (const id of ids) {
    try {
      const result = await distillSession(db, id, model, createChat);
      if (result.skipped) {
        skipped++;
      } else {
        processed++;
        totals.recall += result.toolCalls.recall;
        totals.remember += result.toolCalls.remember;
        totals.revise += result.toolCalls.revise;
        totals.forget += result.toolCalls.forget;
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
