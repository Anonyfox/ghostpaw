import { getHowl } from "../../core/chat/api/read/howls/index.ts";
import { recordHowlReply } from "../../core/chat/api/write/howls/index.ts";
import {
  type ChatFactory,
  closeSession,
  createSession,
  executeTurn,
  type TurnResult,
} from "../../core/chat/api/write/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { assembleContext } from "../context.ts";
import { resolveModel } from "../model.ts";
import { createWardenTools } from "../tools.ts";
import { appendOriginResolutionNote } from "./append_origin_resolution_note.ts";
import { formatHowlOriginContext } from "./format_origin_context.ts";

const MAX_ITERATIONS = 10;

const REPLY_INSTRUCTION = `The user replied to a howl — a proactive question the ghost sent earlier.

Process this interaction:
- **Memory**: Extract beliefs from the user's answer. Recall first to check for duplicates, then remember or revise. Use source "explicit" for direct user statements.
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

  recordHowlReply(db, howl.id, replyText);

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

    const content = [
      REPLY_INSTRUCTION,
      formatHowlOriginContext(db, howl),
      `Howl session #${howl.sessionId}`,
      `Question the ghost asked:\n${howl.message}`,
      `User's reply${options?.replyChannel ? ` via ${options.replyChannel}` : ""}:\n${replyText}`,
    ].join("\n\n");

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

    const summary = result.content.trim().slice(0, 500) || "(processed)";
    appendOriginResolutionNote(
      db,
      howl,
      `**Howl Resolved**\n\nQuestion: ${howl.message}\n\nReply: ${replyText}\n\nSummary: ${summary}`,
    );

    return {
      howlId,
      summary,
      usage: result.usage,
      cost: result.cost,
    };
  } catch {
    const summary = "Reply recorded. Follow-up processing can continue later.";
    appendOriginResolutionNote(
      db,
      howl,
      `**Howl Resolved**\n\nQuestion: ${howl.message}\n\nReply: ${replyText}\n\nSummary: ${summary}`,
    );
    return {
      howlId,
      summary,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      },
      cost: { estimatedUsd: 0 },
    };
  } finally {
    closeSession(db, systemSessionId);
  }
}
