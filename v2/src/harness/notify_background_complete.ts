import { addMessage, getSession } from "../core/chat/index.ts";
import type { DelegationRun } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

export type ChannelNotifyFn = (parentSessionId: number, run: DelegationRun) => void;

export function formatDelegationMessage(run: DelegationRun): string {
  const label = run.specialist || "default";
  const body =
    run.status === "completed" ? (run.result ?? "No output.") : (run.error ?? "Unknown error.");
  const prefix =
    run.status === "completed" ? "Background task completed" : "Background task failed";
  return `**${prefix}** -- *${label}*\n\n${body}`;
}

export function notifyBackgroundComplete(
  db: DatabaseHandle,
  run: DelegationRun,
  channelNotify?: ChannelNotifyFn,
): void {
  const session = getSession(db, run.parentSessionId);
  if (session && !session.closedAt) {
    addMessage(db, {
      sessionId: run.parentSessionId,
      role: "assistant",
      content: formatDelegationMessage(run),
      parentId: session.headMessageId ?? undefined,
    });
  }

  channelNotify?.(run.parentSessionId, run);
}
