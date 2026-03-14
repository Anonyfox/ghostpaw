export type DistillToolCalls = Record<string, number>;

export interface DistillResult {
  skipped: boolean;
  reason?: string;
  toolCalls: DistillToolCalls;
}

export interface DistillPendingResult {
  sessionsProcessed: number;
  sessionsSkipped: number;
  totalToolCalls: DistillToolCalls;
}

export const MIN_SUBSTANTIVE_MESSAGES = 2;
export const MIN_CONVERSATION_LENGTH = 100;
export const MAX_DISTILL_ITERATIONS = 15;
export const MAX_SESSIONS_PER_SWEEP = 50;
export const STALE_THRESHOLD_MS = 86_400_000;
export const ELIGIBLE_PURPOSES = ["chat", "delegate", "howl"] as const;
