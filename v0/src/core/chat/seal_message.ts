import type { DatabaseHandle } from "../../lib/database_handle.ts";

export function sealMessage(db: DatabaseHandle, messageId: number): void {
  db.prepare(
    "UPDATE messages SET sealed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND sealed_at IS NULL",
  ).run(messageId);
}
