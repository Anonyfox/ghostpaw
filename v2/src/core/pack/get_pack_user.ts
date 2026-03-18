import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./internal/rows/row_to_member.ts";
import type { PackMember } from "./types.ts";

export function getPackUser(db: DatabaseHandle): PackMember | null {
  const row = db
    .prepare("SELECT * FROM pack_members WHERE is_user = 1 AND status != 'lost' LIMIT 1")
    .get();
  if (!row) return null;
  return rowToMember(row as Record<string, unknown>);
}
