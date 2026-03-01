import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { Soul } from "./types.ts";

export function getSoul(db: DatabaseHandle, id: number): Soul | null {
  const row = db.prepare("SELECT * FROM souls WHERE id = ?").get(id);
  if (!row) return null;
  return rowToSoul(row as Record<string, unknown>);
}
