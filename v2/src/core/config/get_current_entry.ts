import type { DatabaseHandle } from "../../lib/database.ts";
import { isNullRow } from "../../lib/is_null_row.ts";
import type { ConfigEntry } from "./types.ts";

export function getCurrentEntry(db: DatabaseHandle, key: string): ConfigEntry | null {
  const row = db.prepare("SELECT * FROM config WHERE key = ? AND next_id IS NULL").get(key);
  if (isNullRow(row)) return null;

  return {
    id: row.id as number,
    key: row.key as string,
    value: row.value as string,
    type: row.type as ConfigEntry["type"],
    category: row.category as ConfigEntry["category"],
    source: row.source as ConfigEntry["source"],
    nextId: (row.next_id as number | null) ?? null,
    updatedAt: row.updated_at as number,
  };
}
