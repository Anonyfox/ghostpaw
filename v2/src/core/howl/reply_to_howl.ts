import type { TurnResult } from "../chat/index.ts";
import type { Entity } from "../../harness/types.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { getHowl } from "./get_howl.ts";
import { updateHowlStatus } from "./update_howl.ts";

export interface ReplyToHowlOptions {
  replyChannel?: string;
}

export interface HowlReplyResult {
  howlId: number;
  turn: TurnResult;
}

/**
 * Process a user reply to a pending howl. Routes the reply into the howl's
 * session, runs a full executeTurn so the ghost can process the answer with
 * memory tools, then marks the howl as responded.
 *
 * Throws if the howl doesn't exist or isn't pending.
 */
export async function replyToHowl(
  db: DatabaseHandle,
  entity: Entity,
  howlId: number,
  replyText: string,
  options?: ReplyToHowlOptions,
): Promise<HowlReplyResult> {
  const howl = getHowl(db, howlId);
  if (!howl) {
    throw new Error(`Howl #${howlId} not found.`);
  }
  if (howl.status !== "pending") {
    throw new Error(`Howl #${howlId} is already "${howl.status}".`);
  }

  let prompt = replyText;
  if (options?.replyChannel && howl.channel && options.replyChannel !== howl.channel) {
    prompt = `[Delivered via ${howl.channel}. Reply received on ${options.replyChannel}.]\n\n${replyText}`;
  }

  const turn = await entity.executeTurn(howl.sessionId, prompt);

  updateHowlStatus(db, howlId, "responded");

  return { howlId, turn };
}
