import { closeSession, createSession } from "../../core/chat/api/write/index.ts";
import { defaultChatFactory } from "../../harness/chat_factory.ts";
import type { Entity } from "../../harness/index.ts";
import { resolveModel } from "../../harness/model.ts";
import { handlePostSession } from "../../harness/post_session.ts";
import type { RunInput, RunResult } from "./run_types.ts";
import { toRunResult } from "./to_run_result.ts";

export async function* handleRunStream(
  entity: Entity,
  input: RunInput,
): AsyncGenerator<string, RunResult> {
  const session = createSession(entity.db, `cli:run:${Date.now()}`, { purpose: "chat" });
  const sessionId = session.id as number;
  const gen = entity.streamTurn(sessionId, input.prompt, { model: input.model });

  try {
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        return toRunResult(next.value);
      }
      yield next.value;
    }
  } finally {
    await entity.flush();
    closeSession(entity.db, sessionId);
    const model = resolveModel(entity.db, input.model);
    const p = handlePostSession(entity.db, sessionId, model, defaultChatFactory);
    if (p) await p;
    await gen.return(undefined as never);
  }
}
