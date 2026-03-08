import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

/**
 * Walk the supersession chain for a memory, returning all versions in
 * chronological order (oldest first). Includes predecessors (what this
 * memory replaced) and successors (what replaced it).
 */
export function memoryRevisionChain(db: DatabaseHandle, id: number): Memory[] {
  const chain: Memory[] = [];
  const seen = new Set<number>();

  const predecessors = db
    .prepare("SELECT * FROM memories WHERE superseded_by = ? AND id != ? ORDER BY created_at ASC")
    .all(id, id);
  for (const row of predecessors) {
    const mem = rowToMemory(row);
    if (!seen.has(mem.id)) {
      seen.add(mem.id);
      chain.push(mem);
    }
  }

  const self = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
  if (self) {
    const mem = rowToMemory(self);
    seen.add(mem.id);
    chain.push(mem);
  }

  let current = self ? rowToMemory(self) : null;
  while (current?.supersededBy !== null && current?.supersededBy !== undefined) {
    if (current.supersededBy === current.id) break;
    if (seen.has(current.supersededBy)) break;
    const next = db.prepare("SELECT * FROM memories WHERE id = ?").get(current.supersededBy);
    if (!next) break;
    const mem = rowToMemory(next);
    seen.add(mem.id);
    chain.push(mem);
    current = mem;
  }

  return chain;
}

export interface RevisedMemory {
  id: number;
  claim: string;
  confidence: number;
  revisionDepth: number;
}

/**
 * Active memories that replaced 2+ others, signaling evolving understanding
 * or genuine ambiguity worth reflecting on.
 */
export function heavilyRevisedMemories(db: DatabaseHandle, limit = 5): RevisedMemory[] {
  const rows = db
    .prepare(
      `SELECT m.id, m.claim, m.confidence, COUNT(h.id) AS revision_depth
       FROM memories m
       JOIN memories h ON h.superseded_by = m.id AND h.id != m.id
       WHERE m.superseded_by IS NULL
       GROUP BY m.id
       HAVING revision_depth >= 2
       ORDER BY revision_depth DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{ id: number; claim: string; confidence: number; revision_depth: number }>;

  return rows.map((r) => ({
    id: r.id,
    claim: r.claim,
    confidence: r.confidence,
    revisionDepth: r.revision_depth,
  }));
}
