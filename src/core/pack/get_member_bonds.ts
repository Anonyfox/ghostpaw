import type { DatabaseHandle } from "../../lib/index.ts";

export function getMemberBonds(db: DatabaseHandle, ids: number[]): Map<number, string> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT id, bond FROM pack_members WHERE id IN (${placeholders})`)
    .all(...ids) as { id: number; bond: string }[];
  for (const row of rows) {
    map.set(row.id, row.bond);
  }
  return map;
}
