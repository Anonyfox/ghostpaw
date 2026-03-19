import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { PairingWisdom, WisdomCategory } from "../../internal/index.ts";
import { rowToWisdom } from "../../internal/index.ts";

export interface CreateWisdomInput {
  category: WisdomCategory;
  pattern: string;
  guidance: string;
  confidence?: number;
}

export interface ReviseWisdomInput {
  id: number;
  pattern?: string;
  guidance?: string;
  confidence?: number;
}

export interface UpdatePairingWisdomInput {
  create?: CreateWisdomInput[];
  revise?: ReviseWisdomInput[];
  confirm?: number[];
}

export function updatePairingWisdom(
  db: DatabaseHandle,
  input: UpdatePairingWisdomInput,
): PairingWisdom[] {
  const now = Date.now();
  const results: PairingWisdom[] = [];

  db.exec("BEGIN");
  try {
    createEntries(db, input, now, results);
    reviseEntries(db, input, now, results);
    confirmEntries(db, input, now, results);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return results;
}

function createEntries(
  db: DatabaseHandle,
  input: UpdatePairingWisdomInput,
  now: number,
  results: PairingWisdom[],
): void {
  if (!input.create) return;
  const stmt = db.prepare(
    `INSERT INTO trail_pairing_wisdom (category, pattern, guidance, confidence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const c of input.create) {
    const { lastInsertRowid } = stmt.run(
      c.category,
      c.pattern,
      c.guidance,
      c.confidence ?? 0.3,
      now,
      now,
    );
    const row = db.prepare("SELECT * FROM trail_pairing_wisdom WHERE id = ?").get(lastInsertRowid);
    results.push(rowToWisdom(row as Record<string, unknown>));
  }
}

function reviseEntries(
  db: DatabaseHandle,
  input: UpdatePairingWisdomInput,
  now: number,
  results: PairingWisdom[],
): void {
  if (!input.revise) return;
  for (const r of input.revise) {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (r.pattern !== undefined) {
      sets.push("pattern = ?");
      params.push(r.pattern);
    }
    if (r.guidance !== undefined) {
      sets.push("guidance = ?");
      params.push(r.guidance);
    }
    if (r.confidence !== undefined) {
      sets.push("confidence = ?");
      params.push(r.confidence);
    }
    if (sets.length > 0) {
      sets.push("evidence_count = evidence_count + 1, updated_at = ?");
      params.push(now, r.id);
      db.prepare(`UPDATE trail_pairing_wisdom SET ${sets.join(", ")} WHERE id = ?`).run(...params);
      const row = db.prepare("SELECT * FROM trail_pairing_wisdom WHERE id = ?").get(r.id);
      if (row) results.push(rowToWisdom(row as Record<string, unknown>));
    }
  }
}

function confirmEntries(
  db: DatabaseHandle,
  input: UpdatePairingWisdomInput,
  now: number,
  results: PairingWisdom[],
): void {
  if (!input.confirm) return;
  const stmt = db.prepare(
    "UPDATE trail_pairing_wisdom SET evidence_count = evidence_count + 1, hit_count = hit_count + 1, updated_at = ? WHERE id = ?",
  );
  for (const id of input.confirm) {
    stmt.run(now, id);
    const row = db.prepare("SELECT * FROM trail_pairing_wisdom WHERE id = ?").get(id);
    if (row) results.push(rowToWisdom(row as Record<string, unknown>));
  }
}
