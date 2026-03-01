import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToSoul } from "./row_to_soul.ts";
import type { Soul } from "./types.ts";

export function getSoulByName(db: DatabaseHandle, name: string): Soul | null {
  const row = db.prepare("SELECT * FROM souls WHERE name = ? AND deleted_at IS NULL").get(name);
  if (!row) return null;
  return rowToSoul(row as Record<string, unknown>);
}
