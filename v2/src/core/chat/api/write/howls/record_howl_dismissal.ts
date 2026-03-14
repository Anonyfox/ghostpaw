import type { DatabaseHandle } from "../../../../../lib/index.ts";
import { addMessage } from "../../../add_message.ts";
import { closeSession } from "../../../close_session.ts";
import { getSession } from "../../../get_session.ts";
import { updateHowlStatus } from "../../../internal/howls/update_howl.ts";
import { getHowl } from "../../read/howls/get_howl.ts";

export function recordHowlDismissal(db: DatabaseHandle, howlId: number): number {
  const howl = getHowl(db, howlId);
  if (!howl) {
    throw new Error(`Howl #${howlId} not found.`);
  }

  db.exec("BEGIN");
  try {
    const session = getSession(db, howl.sessionId);
    if (!session) {
      throw new Error(`Howl session #${howl.sessionId} not found.`);
    }

    const message = addMessage(db, {
      sessionId: howl.sessionId,
      role: "user",
      content: "[Dismissed]",
      parentId: session.headMessageId ?? undefined,
    });
    updateHowlStatus(db, howl.id, "dismissed", message.id);
    closeSession(db, howl.sessionId);
    db.exec("COMMIT");
    return message.id;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
