import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToStoryline } from "./row_to_storyline.ts";
import type { Storyline } from "./types.ts";

export function getStoryline(db: DatabaseHandle, id: number): Storyline | null {
  const row = db.prepare("SELECT * FROM storylines WHERE id = ?").get(id);
  if (!row) return null;
  return rowToStoryline(row as Record<string, unknown>);
}
