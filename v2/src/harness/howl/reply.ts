import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import type { TurnResult } from "../../core/chat/index.ts";
import {
  addMessage,
  closeSession,
  createSession,
  executeTurn,
  getSession,
} from "../../core/chat/index.ts";
import { getHowl, updateHowlStatus } from "../../core/howl/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { assembleContext } from "../context.ts";
import { resolveModel } from "../model.ts";
import { createWardenTools } from "../tools.ts";

const MAX_ITERATIONS = 10;

const REPLY_INSTRUCTION = `The user replied to a howl — a proactive question the ghost sent earlier.

Process this interaction:
- **Memory**: Extract beliefs from the user's answer. Recall first to check for duplicates, then remember or revise. Use confidence 0.7-0.8 with source "stated" for direct user statements.
- **Pack**: Note the user's engagement — they chose to reply, which means the topic matters to them. Update the bond if appropriate.
- **Quests**: If the reply implies a task or commitment, create or update a quest.

Write a brief summary (1-2 sentences) of what was learned. Be concise.`;

export interface HowlReplyOptions {
  replyChannel?: string;
  chatFactory?: ChatFactory;
  model?: string;
}

export interface HowlReplyResult {
  howlId: number;
  summary: string;
  usage: TurnResult["usage"];
  cost: TurnResult["cost"];
}

export async function processHowlReply(
  db: DatabaseHandle,
  howlId: number,
  replyText: string,
  options?: HowlReplyOptions,
): Promise<HowlReplyResult> {
  const howl = getHowl(db, howlId);
  if (!howl) {
    throw new Error(`Howl #${howlId} not found.`);
  }
  if (howl.status !== "pending") {
    throw new Error(`Howl #${howlId} is already "${howl.status}".`);
  }

  const originSession = getSession(db, howl.originSessionId);
  if (originSession) {
    const parentId = howl.originMessageId ?? originSession.headMessageId ?? undefined;
    addMessage(db, {
      sessionId: howl.originSessionId,
      role: "user",
      content: `[Howl reply${options?.replyChannel ? ` via ${options.replyChannel}` : ""}] ${replyText}`,
      parentId,
    });
  }

  const createChat: ChatFactory = options?.chatFactory ?? defaultChatFactory;
  const model = resolveModel(db, options?.model);

  const systemSession = createSession(db, `system:howl-reply:${howlId}`, {
    purpose: "system",
    soulId: MANDATORY_SOUL_IDS.warden,
  });
  const systemSessionId = systemSession.id as number;

  try {
    const tools = createWardenTools(db);
    const systemPrompt = assembleContext(db, "", {
      soulId: MANDATORY_SOUL_IDS.warden,
    });

    const content = `${REPLY_INSTRUCTION}\n\nQuestion the ghost asked:\n${howl.message}\n\nUser's reply:\n${replyText}`;

    const result = await executeTurn(
      {
        sessionId: systemSessionId,
        content,
        systemPrompt,
        model,
        maxIterations: MAX_ITERATIONS,
      },
      { db, tools, createChat },
    );

    updateHowlStatus(db, howlId, "responded");

    const summary = result.content.trim().slice(0, 500) || "(processed)";

    return {
      howlId,
      summary,
      usage: result.usage,
      cost: result.cost,
    };
  } finally {
    closeSession(db, systemSessionId);
  }
}
