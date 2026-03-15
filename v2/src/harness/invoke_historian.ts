import type { Tool } from "chatoyant";
import type { TurnResult } from "../core/chat/api/write/index.ts";
import { closeSession, createSession } from "../core/chat/api/write/index.ts";
import { MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import type { Entity } from "./types.ts";

export interface HistorianResult {
  turns: HistorianTurnResult[];
  succeeded: boolean;
}

export interface HistorianTurnResult {
  content: string;
  succeeded: boolean;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
}

export async function invokeHistorian(
  entity: Entity,
  db: DatabaseHandle,
  prompts: string[],
  options?: { model?: string; tools?: Tool[] },
): Promise<HistorianResult> {
  const session = createSession(db, `system:historian:${Date.now()}`, {
    purpose: "system",
  });
  const sessionId = session.id as number;
  const turns: HistorianTurnResult[] = [];
  let allSucceeded = true;

  try {
    for (const prompt of prompts) {
      const result = await entity.executeTurn(sessionId, prompt, {
        soulId: MANDATORY_SOUL_IDS.historian,
        model: options?.model,
        tools: options?.tools,
      });
      turns.push({
        content: result.content,
        succeeded: result.succeeded,
        usage: result.usage,
        cost: result.cost,
      });
      if (!result.succeeded) {
        allSucceeded = false;
        break;
      }
    }
  } finally {
    await entity.flush();
    closeSession(db, sessionId);
  }

  return { turns, succeeded: allSucceeded };
}
