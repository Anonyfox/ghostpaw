import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { LoopAction, LoopCategory, LoopStatus, OpenLoop } from "../../internal/index.ts";
import { rowToOpenLoop } from "../../internal/index.ts";

export interface CreateLoopInput {
  description: string;
  category?: LoopCategory;
  sourceType?: string | null;
  sourceId?: string | null;
  significance?: number;
  recommendedAction?: LoopAction | null;
  earliestResurface?: number | null;
}

export interface UpdateLoopInput {
  id: number;
  significance?: number;
  status?: LoopStatus;
  recommendedAction?: LoopAction | null;
  earliestResurface?: number | null;
}

export interface UpdateOpenLoopsInput {
  create?: CreateLoopInput[];
  update?: UpdateLoopInput[];
  dismiss?: number[];
  decay?: { factor: number; excludeIds?: number[] };
  storageLimit?: number;
}

export function updateOpenLoops(db: DatabaseHandle, input: UpdateOpenLoopsInput): OpenLoop[] {
  const now = Date.now();
  const results: OpenLoop[] = [];

  db.exec("BEGIN");
  try {
    applyDecay(db, input, now);
    createLoops(db, input, now, results);
    applyUpdates(db, input, now, results);
    dismissLoops(db, input, now);
    enforceStorageLimit(db, input, now);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return results;
}

function applyDecay(db: DatabaseHandle, input: UpdateOpenLoopsInput, now: number): void {
  if (!input.decay) return;
  const excludeClause =
    input.decay.excludeIds && input.decay.excludeIds.length > 0
      ? `AND id NOT IN (${input.decay.excludeIds.map(() => "?").join(",")})`
      : "";
  const params: unknown[] = [input.decay.factor, now];
  if (input.decay.excludeIds) params.push(...input.decay.excludeIds);
  db.prepare(
    `UPDATE trail_open_loops
     SET significance = significance * ?, updated_at = ?
     WHERE status IN ('alive', 'dormant') ${excludeClause}`,
  ).run(...params);
}

function createLoops(
  db: DatabaseHandle,
  input: UpdateOpenLoopsInput,
  now: number,
  results: OpenLoop[],
): void {
  if (!input.create) return;
  const stmt = db.prepare(
    `INSERT INTO trail_open_loops
     (description, category, source_type, source_id, significance, recommended_action, earliest_resurface, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const c of input.create) {
    const { lastInsertRowid } = stmt.run(
      c.description,
      c.category ?? "organic",
      c.sourceType ?? null,
      c.sourceId ?? null,
      c.significance ?? 0.5,
      c.recommendedAction ?? null,
      c.earliestResurface ?? null,
      now,
      now,
    );
    const row = db.prepare("SELECT * FROM trail_open_loops WHERE id = ?").get(lastInsertRowid);
    results.push(rowToOpenLoop(row as Record<string, unknown>));
  }
}

function applyUpdates(
  db: DatabaseHandle,
  input: UpdateOpenLoopsInput,
  now: number,
  results: OpenLoop[],
): void {
  if (!input.update) return;
  for (const u of input.update) {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (u.significance !== undefined) {
      sets.push("significance = ?");
      params.push(u.significance);
    }
    if (u.status !== undefined) {
      sets.push("status = ?");
      params.push(u.status);
    }
    if (u.recommendedAction !== undefined) {
      sets.push("recommended_action = ?");
      params.push(u.recommendedAction);
    }
    if (u.earliestResurface !== undefined) {
      sets.push("earliest_resurface = ?");
      params.push(u.earliestResurface);
    }
    if (sets.length > 0) {
      sets.push("updated_at = ?");
      params.push(now, u.id);
      db.prepare(`UPDATE trail_open_loops SET ${sets.join(", ")} WHERE id = ?`).run(...params);
      const row = db.prepare("SELECT * FROM trail_open_loops WHERE id = ?").get(u.id);
      if (row) results.push(rowToOpenLoop(row as Record<string, unknown>));
    }
  }
}

function dismissLoops(db: DatabaseHandle, input: UpdateOpenLoopsInput, now: number): void {
  if (!input.dismiss) return;
  const stmt = db.prepare(
    "UPDATE trail_open_loops SET status = 'dismissed', updated_at = ? WHERE id = ?",
  );
  for (const id of input.dismiss) {
    stmt.run(now, id);
  }
}

function enforceStorageLimit(db: DatabaseHandle, input: UpdateOpenLoopsInput, now: number): void {
  if (!input.storageLimit) return;
  const activeCount = (
    db
      .prepare("SELECT COUNT(*) AS c FROM trail_open_loops WHERE status IN ('alive', 'dormant')")
      .get() as { c: number }
  ).c;
  if (activeCount > input.storageLimit) {
    const excess = activeCount - input.storageLimit;
    db.prepare(
      `UPDATE trail_open_loops SET status = 'dismissed', updated_at = ?
       WHERE id IN (
         SELECT id FROM trail_open_loops
         WHERE status IN ('alive', 'dormant')
         ORDER BY significance ASC
         LIMIT ?
       )`,
    ).run(now, excess);
  }
}
