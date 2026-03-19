import type { DatabaseHandle } from "../../lib/index.ts";

export function countInteractions(db: DatabaseHandle, memberId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM pack_interactions WHERE member_id = ?")
    .get(memberId) as { c: number };
  return row.c;
}
