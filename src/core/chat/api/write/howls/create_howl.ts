import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { addMessage } from "../../../add_message.ts";
import { createSession } from "../../../create_session.ts";
import { getSession } from "../../../get_session.ts";
import { storeHowl } from "../../../internal/howls/store_howl.ts";
import type { CreateHowlInput, Howl } from "../../../internal/howls/types.ts";

export function createHowl(db: DatabaseHandle, input: CreateHowlInput): Howl {
  const originSession = getSession(db, input.originSessionId);
  const key = `howl:${input.originSessionId}:${Date.now()}`;

  db.exec("BEGIN");
  try {
    const session = createSession(db, key, {
      purpose: "howl",
      parentSessionId: input.originSessionId,
      soulId: originSession?.soulId ?? undefined,
    });
    const sessionId = session.id as number;

    addMessage(db, {
      sessionId,
      role: "assistant",
      content: input.message,
    });

    const howl = storeHowl(db, {
      ...input,
      sessionId,
    });

    db.exec("COMMIT");
    return howl;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
