import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { ShadeImpression } from "./types.ts";

export function writeImpression(
  db: DatabaseHandle,
  opts: {
    sessionId: number;
    sealedMsgId: number;
    soulId: number;
    impressions: string;
    impressionCount: number;
    ingestSessionId: number | null;
  },
): ShadeImpression {
  const result = db
    .prepare(
      `INSERT INTO shade_impressions
         (session_id, sealed_msg_id, soul_id, impressions, impression_count, ingest_session_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.sessionId,
      opts.sealedMsgId,
      opts.soulId,
      opts.impressions.trim(),
      opts.impressionCount,
      opts.ingestSessionId,
    );

  const id = Number(result.lastInsertRowid);
  return db
    .prepare("SELECT * FROM shade_impressions WHERE id = ?")
    .get(id) as unknown as ShadeImpression;
}
