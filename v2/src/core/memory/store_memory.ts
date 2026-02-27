import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory, MemorySource, StoreOptions } from "./types.ts";
import { vectorToBuffer } from "./vector_to_buffer.ts";

const SOURCE_CONFIDENCE: Record<MemorySource, number> = {
  explicit: 0.9,
  observed: 0.8,
  absorbed: 0.6,
  inferred: 0.5,
};

export function storeMemory(
  db: DatabaseHandle,
  claim: string,
  embedding: number[],
  options?: StoreOptions,
): Memory {
  const trimmed = claim.trim();
  if (trimmed.length === 0) {
    throw new Error("Memory claim must not be empty");
  }
  const source = options?.source ?? "absorbed";
  const category = options?.category ?? "custom";
  const raw = options?.confidence ?? SOURCE_CONFIDENCE[source];
  const confidence = Math.max(0, Math.min(1, raw));
  const now = Date.now();
  const blob = vectorToBuffer(embedding);

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO memories (claim, embedding, confidence, evidence_count, created_at, verified_at, source, category)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
    )
    .run(trimmed, blob, confidence, now, now, source, category);

  const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(lastInsertRowid);
  return rowToMemory(row as Record<string, unknown>);
}
