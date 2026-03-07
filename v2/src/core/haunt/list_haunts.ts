import type { DatabaseHandle } from "../../lib/index.ts";
import type { HauntSummary } from "./types.ts";

export function listHaunts(db: DatabaseHandle, limit = 10): HauntSummary[] {
  const rows = db
    .prepare("SELECT id, summary, created_at FROM haunts ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    summary: row.summary as string,
    createdAt: row.created_at as number,
  }));
}

export function getRecentSeededMemoryIds(db: DatabaseHandle, limit = 3): Set<number> {
  const rows = db
    .prepare("SELECT seeded_memory_ids FROM haunts ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit) as Array<{ seeded_memory_ids: string }>;

  const ids = new Set<number>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.seeded_memory_ids) as number[];
      for (const id of parsed) ids.add(id);
    } catch {
      /* malformed JSON, skip */
    }
  }
  return ids;
}
