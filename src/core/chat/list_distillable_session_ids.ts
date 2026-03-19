import type { DatabaseHandle } from "../../lib/index.ts";

const DEFAULT_MAX_SESSIONS = 50;
const DEFAULT_STALE_THRESHOLD_MS = 86_400_000;
const RETRY_WINDOW_MS = 86_400_000;

export interface ListDistillableOptions {
  maxSessions?: number;
  staleThresholdMs?: number;
  eligiblePurposes?: readonly string[];
}

export function listDistillableSessionIds(
  db: DatabaseHandle,
  options?: ListDistillableOptions,
): number[] {
  const maxSessions = options?.maxSessions ?? DEFAULT_MAX_SESSIONS;
  const staleThresholdMs = options?.staleThresholdMs ?? DEFAULT_STALE_THRESHOLD_MS;
  const staleThreshold = Date.now() - staleThresholdMs;
  const retryAfter = Date.now() - RETRY_WINDOW_MS;
  const purposes = options?.eligiblePurposes ?? ["chat", "delegate"];
  const placeholders = purposes.map(() => "?").join(", ");

  const rows = db
    .prepare(
      `SELECT id FROM sessions
       WHERE distilled_at IS NULL
         AND head_message_id IS NOT NULL
         AND purpose IN (${placeholders})
         AND (closed_at IS NOT NULL OR last_active_at < ?)
         AND (distill_failed_at IS NULL OR distill_failed_at < ?)
       ORDER BY last_active_at ASC
       LIMIT ?`,
    )
    .all(...purposes, staleThreshold, retryAfter, maxSessions) as { id: number }[];

  return rows.map((r) => r.id);
}
