import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { Omen } from "../../internal/index.ts";
import { rowToOmen } from "../../internal/index.ts";

export interface ResolveOmenInput {
  id: number;
  outcome: string;
  predictionError?: number | null;
}

export function resolveOmens(db: DatabaseHandle, resolutions: ResolveOmenInput[]): Omen[] {
  const now = Date.now();
  const results: Omen[] = [];

  db.exec("BEGIN");
  try {
    const stmt = db.prepare(
      "UPDATE trail_omens SET resolved_at = ?, outcome = ?, prediction_error = ? WHERE id = ?",
    );
    for (const r of resolutions) {
      stmt.run(now, r.outcome, r.predictionError ?? null, r.id);
      const row = db.prepare("SELECT * FROM trail_omens WHERE id = ?").get(r.id);
      if (row) results.push(rowToOmen(row as Record<string, unknown>));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return results;
}
