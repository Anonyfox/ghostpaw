import type { Tool } from "chatoyant";
import type { TurnResult } from "../core/chat/index.ts";
import { closeSession, createSession } from "../core/chat/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { Entity } from "./types.ts";

export interface MentorResult {
  content: string;
  succeeded: boolean;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
}

export async function invokeMentor(
  entity: Entity,
  db: DatabaseHandle,
  prompt: string,
  options?: { model?: string; tools?: Tool[] },
): Promise<MentorResult> {
  const session = createSession(db, `system:mentor:${Date.now()}`, {
    purpose: "system",
  });
  const sessionId = session.id as number;

  try {
    const result = await entity.executeTurn(sessionId, prompt, {
      soulId: MANDATORY_SOUL_IDS.mentor,
      model: options?.model,
      tools: options?.tools,
    });
    return {
      content: result.content,
      succeeded: result.succeeded,
      usage: result.usage,
      cost: result.cost,
    };
  } finally {
    await entity.flush();
    closeSession(db, sessionId);
  }
}
