import type { DatabaseHandle } from "../../lib/index.ts";
import type { Haunt, StoreHauntInput } from "./types.ts";

export function storeHaunt(db: DatabaseHandle, input: StoreHauntInput): Haunt {
  const now = Date.now();
  const seededIds = input.seededMemoryIds ?? [];
  const seededJson = JSON.stringify(seededIds);
  const result = db
    .prepare(
      `INSERT INTO haunts (session_id, raw_journal, summary, seeded_memory_ids, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.sessionId, input.rawJournal, input.summary, seededJson, now);

  return {
    id: result.lastInsertRowid as number,
    sessionId: input.sessionId,
    rawJournal: input.rawJournal,
    summary: input.summary,
    seededMemoryIds: seededIds,
    createdAt: now,
  };
}
