import { addMessage, getSession } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { DelegationOutcome } from "./types.ts";

export type ChannelNotifyFn = (parentSessionId: number, outcome: DelegationOutcome) => void;

export function formatDelegationMessage(outcome: DelegationOutcome): string {
  const label = outcome.specialist || "default";
  const body =
    outcome.status === "completed"
      ? (outcome.result ?? "No output.")
      : (outcome.error ?? "Unknown error.");
  const prefix =
    outcome.status === "completed" ? "Background task completed" : "Background task failed";
  return `**${prefix}** -- *${label}*\n\n${body}`;
}

export function notifyBackgroundComplete(
  db: DatabaseHandle,
  outcome: DelegationOutcome,
  channelNotify?: ChannelNotifyFn,
): void {
  const session = getSession(db, outcome.parentSessionId);
  if (session && !session.closedAt) {
    addMessage(db, {
      sessionId: outcome.parentSessionId,
      role: "assistant",
      content: formatDelegationMessage(outcome),
      parentId: session.headMessageId ?? undefined,
    });
  }

  channelNotify?.(outcome.parentSessionId, outcome);
}
