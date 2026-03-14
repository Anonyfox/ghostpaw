import { getHowl } from "../../core/chat/api/read/howls/index.ts";
import { recordHowlDismissal } from "../../core/chat/api/write/howls/index.ts";
import {
  type ChatFactory,
  closeSession,
  createSession,
  executeTurn,
} from "../../core/chat/api/write/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { assembleContext } from "../context.ts";
import { resolveModel } from "../model.ts";
import { createWardenTools } from "../tools.ts";
import { appendOriginResolutionNote } from "./append_origin_resolution_note.ts";
import { formatHowlOriginContext } from "./format_origin_context.ts";

const MAX_ITERATIONS = 5;

const DISMISS_INSTRUCTION = `The user dismissed a howl without replying. This is meaningful signal.

Process this briefly:
- **Memory**: Note the dismissal pattern. "User dismissed a question about [topic]" with confidence 0.5, source "observed".
- **Pack**: The dismissal tells us something about what the user considers worth their time. Note it if relevant.

Write one sentence about what the dismissal suggests. Be concise.`;

export interface HowlDismissOptions {
  chatFactory?: ChatFactory;
  model?: string;
}

export async function processHowlDismiss(
  db: DatabaseHandle,
  howlId: number,
  options?: HowlDismissOptions,
): Promise<void> {
  const howl = getHowl(db, howlId);
  if (!howl) {
    throw new Error(`Howl #${howlId} not found.`);
  }
  if (howl.status !== "pending") {
    throw new Error(`Howl #${howlId} is already "${howl.status}".`);
  }

  recordHowlDismissal(db, howl.id);

  const createChat: ChatFactory = options?.chatFactory ?? defaultChatFactory;
  const model = resolveModel(db, options?.model);

  const systemSession = createSession(db, `system:howl-dismiss:${howlId}`, {
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
      DISMISS_INSTRUCTION,
      formatHowlOriginContext(db, howl),
      `Howl session #${howl.sessionId}`,
      `Dismissed question:\n${howl.message}`,
    ].join("\n\n");

    await executeTurn(
      {
        sessionId: systemSessionId,
        content,
        systemPrompt,
        model,
        maxIterations: MAX_ITERATIONS,
      },
      { db, tools, createChat },
    );
    appendOriginResolutionNote(
      db,
      howl,
      `**Howl Dismissed**\n\nQuestion: ${howl.message}\n\nThe user dismissed this request.`,
    );
  } catch {
    // Dismiss consolidation is best-effort — the status is already updated
    appendOriginResolutionNote(
      db,
      howl,
      `**Howl Dismissed**\n\nQuestion: ${howl.message}\n\nThe user dismissed this request.`,
    );
  } finally {
    closeSession(db, systemSessionId);
  }
}
