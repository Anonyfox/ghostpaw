import type { DatabaseHandle } from "../../lib/index.ts";

export function countActiveTraits(db: DatabaseHandle, soulId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM soul_traits WHERE soul_id = ? AND status = 'active'")
    .get(soulId) as { count: number } | undefined;
  return row?.count ?? 0;
}
