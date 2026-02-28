import type { TurnContext } from "../../core/chat/index.ts";
import { closeSession, createSession, executeTurn } from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveModel } from "./resolve_model.ts";
import type { RunInput, RunResult } from "./run_types.ts";
import { DEFAULT_SYSTEM_PROMPT } from "./run_types.ts";
import { toRunResult } from "./to_run_result.ts";

export async function handleRun(db: DatabaseHandle, input: RunInput): Promise<RunResult> {
  const model = resolveModel(db, input.model);
  const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const session = createSession(db, `cli:run:${Date.now()}`, { purpose: "chat" });
  const ctx: TurnContext = { db, tools: [], createChat: input.createChat };

  try {
    const result = await executeTurn(
      { sessionId: session.id, content: input.prompt, systemPrompt, model },
      ctx,
    );
    return toRunResult(result);
  } finally {
    closeSession(db, session.id);
  }
}
