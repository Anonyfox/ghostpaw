import { getSession } from "../core/chat/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";
import type { DelegationOutcome, Entity } from "./types.ts";

function formatResumePrompt(outcome: DelegationOutcome): string {
  const label = outcome.specialist || "default";
  const verb = outcome.status === "completed" ? "completed" : "failed";
  const body =
    outcome.status === "completed"
      ? (outcome.result ?? "No output.")
      : (outcome.error ?? "Unknown error.");
  return [
    `[System: Background delegation by "${label}" ${verb}. Result:`,
    "",
    body,
    "",
    "Summarize this outcome for the user.]",
  ].join("\n");
}

export async function autoResumeDelegation(
  db: DatabaseHandle,
  entity: Entity,
  outcome: DelegationOutcome,
  channelNotify?: ChannelNotifyFn,
): Promise<void> {
  const session = getSession(db, outcome.parentSessionId);
  if (!session || session.closedAt) {
    channelNotify?.(outcome.parentSessionId, outcome);
    return;
  }

  try {
    const prompt = formatResumePrompt(outcome);
    await entity.executeTurn(outcome.parentSessionId, prompt);
    channelNotify?.(outcome.parentSessionId, outcome);
  } catch {
    notifyBackgroundComplete(db, outcome, channelNotify);
  }
}
