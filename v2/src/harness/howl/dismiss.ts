import type { ChatFactory } from "../../core/chat/chat_instance.ts";
import { closeSession, createSession, executeTurn } from "../../core/chat/index.ts";
import { getHowl, updateHowlStatus } from "../../core/howl/index.ts";
import { MANDATORY_SOUL_IDS } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { defaultChatFactory } from "../chat_factory.ts";
import { assembleContext } from "../context.ts";
import { resolveModel } from "../model.ts";
import { createWardenTools } from "../tools.ts";

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

  updateHowlStatus(db, howlId, "dismissed");

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

    const content = `${DISMISS_INSTRUCTION}\n\nDismissed question:\n${howl.message}`;

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
  } catch {
    // Dismiss consolidation is best-effort — the status is already updated
  } finally {
    closeSession(db, systemSessionId);
  }
}
