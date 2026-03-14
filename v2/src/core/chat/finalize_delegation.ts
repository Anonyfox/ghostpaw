import type { DatabaseHandle } from "../../lib/index.ts";
import { closeSession } from "./close_session.ts";

export function finalizeDelegation(
  db: DatabaseHandle,
  childSessionId: number,
  error?: string,
): void {
  db.exec("BEGIN");
  try {
    closeSession(db, childSessionId, error);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
