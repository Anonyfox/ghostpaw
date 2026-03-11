import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./internal/rows/row_to_member.ts";
import type { PackMember } from "./types.ts";

export function getMemberByName(db: DatabaseHandle, name: string): PackMember | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  const row = db
    .prepare("SELECT * FROM pack_members WHERE name = ? AND status != 'lost'")
    .get(trimmed);
  if (!row) return null;
  return rowToMember(row as Record<string, unknown>);
}
