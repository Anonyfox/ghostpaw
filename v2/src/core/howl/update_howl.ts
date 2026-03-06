import type { DatabaseHandle } from "../../lib/index.ts";
import type { HowlStatus } from "./types.ts";

export function updateHowlStatus(
  db: DatabaseHandle,
  id: number,
  status: HowlStatus,
): void {
  const now = status === "responded" || status === "dismissed" ? Date.now() : null;
  db.prepare("UPDATE howls SET status = ?, responded_at = COALESCE(?, responded_at) WHERE id = ?").run(
    status,
    now,
    id,
  );
}

export function updateHowlChannel(
  db: DatabaseHandle,
  id: number,
  channel: string,
): void {
  db.prepare("UPDATE howls SET channel = ? WHERE id = ?").run(channel, id);
}
