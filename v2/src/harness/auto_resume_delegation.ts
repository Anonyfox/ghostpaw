import { getSession } from "../core/chat/index.ts";
import type { DelegationRun } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { ChannelNotifyFn } from "./notify_background_complete.ts";
import { notifyBackgroundComplete } from "./notify_background_complete.ts";
import type { Entity } from "./types.ts";

function formatResumePrompt(run: DelegationRun): string {
  const label = run.specialist || "default";
  const verb = run.status === "completed" ? "completed" : "failed";
  const body =
    run.status === "completed" ? (run.result ?? "No output.") : (run.error ?? "Unknown error.");
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
  run: DelegationRun,
  channelNotify?: ChannelNotifyFn,
): Promise<void> {
  const session = getSession(db, run.parentSessionId);
  if (!session || session.closedAt) {
    channelNotify?.(run.parentSessionId, run);
    return;
  }

  try {
    const prompt = formatResumePrompt(run);
    await entity.executeTurn(run.parentSessionId, prompt);
    channelNotify?.(run.parentSessionId, run);
  } catch {
    notifyBackgroundComplete(db, run, channelNotify);
  }
}
