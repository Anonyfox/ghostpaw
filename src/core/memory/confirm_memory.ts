import type { DatabaseHandle } from "../../lib/index.ts";
import { resolveMemoryConfig } from "./resolve_config.ts";
import { rowToMemory } from "./row_to_memory.ts";
import type { Memory } from "./types.ts";

export function confirmMemory(db: DatabaseHandle, id: number): Memory {
  const row = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
  if (!row) throw new Error(`Memory #${id} not found`);

  const mem = rowToMemory(row as Record<string, unknown>);
  if (mem.supersededBy !== null) {
    throw new Error(`Memory #${id} is superseded and cannot be confirmed`);
  }

  const alpha = resolveMemoryConfig(db, "memory_ema_alpha", undefined);
  const maxConf = resolveMemoryConfig(db, "memory_max_confidence", undefined);

  const raw = alpha * 1.0 + (1 - alpha) * mem.confidence;
  const newConfidence = Math.min(raw, maxConf);
  const now = Date.now();

  db.prepare(
    `UPDATE memories SET confidence = ?, evidence_count = evidence_count + 1, verified_at = ?
     WHERE id = ?`,
  ).run(newConfidence, now, id);

  const updated = db.prepare("SELECT * FROM memories WHERE id = ?").get(id);
  return rowToMemory(updated as Record<string, unknown>);
}
