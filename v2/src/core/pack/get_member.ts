import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./row_to_member.ts";
import type { PackMember } from "./types.ts";

export function getMember(db: DatabaseHandle, id: number): PackMember | null {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id);
  if (!row) return null;
  return rowToMember(row as Record<string, unknown>);
}
