import type { DatabaseHandle } from "../../lib/index.ts";

export function getMemberTags(db: DatabaseHandle, ids: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT member_id, key FROM pack_fields
       WHERE member_id IN (${placeholders}) AND value IS NULL
       ORDER BY member_id, key`,
    )
    .all(...ids) as { member_id: number; key: string }[];
  for (const row of rows) {
    const list = map.get(row.member_id) ?? [];
    list.push(row.key);
    map.set(row.member_id, list);
  }
  return map;
}
