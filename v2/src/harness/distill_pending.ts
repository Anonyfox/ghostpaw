import type { ChatFactory } from "../core/chat/chat_instance.ts";
import { deleteOldDistilled } from "../core/chat/index.ts";
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
  const staleThreshold = Date.now() - staleThresholdMs;
  const purposes = ELIGIBLE_PURPOSES.map((p) => `'${p}'`).join(", ");

  const rows = db
    .prepare(
      `SELECT id FROM sessions
       WHERE distilled_at IS NULL
         AND head_message_id IS NOT NULL
         AND purpose IN (${purposes})
         AND (closed_at IS NOT NULL OR last_active_at < ?)
       ORDER BY last_active_at ASC
       LIMIT ?`,
    )
    .all(staleThreshold, maxSessions) as { id: number }[];

  const totals: DistillToolCalls = { recall: 0, remember: 0, revise: 0, forget: 0 };
  let processed = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      const result = await distillSession(db, row.id, model, createChat);
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
