import type { DatabaseHandle } from "../../lib/index.ts";

export function getMemberName(db: DatabaseHandle, id: number): string | null {
  const row = db.prepare("SELECT name FROM pack_members WHERE id = ?").get(id) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}
