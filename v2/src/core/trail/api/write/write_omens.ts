import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Omen } from "../../internal/index.ts";
import { rowToOmen } from "../../internal/index.ts";

export interface WriteOmenInput {
  forecast: string;
  confidence: number;
  horizon?: number | null;
}

export function writeOmens(db: DatabaseHandle, omens: WriteOmenInput[]): Omen[] {
  const now = Date.now();
  const results: Omen[] = [];

  db.exec("BEGIN");
  try {
    const stmt = db.prepare(
      "INSERT INTO trail_omens (forecast, confidence, horizon, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const o of omens) {
      const { lastInsertRowid } = stmt.run(o.forecast, o.confidence, o.horizon ?? null, now);
      const row = db.prepare("SELECT * FROM trail_omens WHERE id = ?").get(lastInsertRowid);
      results.push(rowToOmen(row as Record<string, unknown>));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return results;
}
