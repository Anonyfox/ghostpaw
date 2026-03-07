import type { DatabaseHandle } from "../../lib/index.ts";
import type { SessionUsageDelta } from "./accumulate_usage.ts";
import { accumulateUsage } from "./accumulate_usage.ts";
import { closeSession } from "./close_session.ts";

export function finalizeDelegation(
  db: DatabaseHandle,
  parentSessionId: number,
  childSessionId: number,
  usage: SessionUsageDelta,
  error?: string,
): void {
  db.exec("BEGIN");
  try {
    accumulateUsage(db, parentSessionId, usage);
    closeSession(db, childSessionId, error);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
