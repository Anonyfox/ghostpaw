import type { DatabaseHandle } from "../../lib/index.ts";
import { isNullRow } from "../../lib/index.ts";
import type { Haunt } from "./types.ts";

export function getHaunt(db: DatabaseHandle, id: number): Haunt | null {
  const row = db.prepare("SELECT * FROM haunts WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (isNullRow(row)) return null;
  let seededMemoryIds: number[] = [];
  try {
    seededMemoryIds = JSON.parse((row.seeded_memory_ids as string) || "[]");
  } catch {
    /* malformed JSON */
  }
  return {
    id: row.id as number,
    sessionId: row.session_id as number,
    rawJournal: row.raw_journal as string,
    summary: row.summary as string,
    seededMemoryIds,
    createdAt: row.created_at as number,
  };
}
