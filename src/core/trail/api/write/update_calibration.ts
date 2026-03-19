import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { CalibrationEntry, CalibrationTrajectory } from "../../internal/index.ts";
import { rowToCalibration } from "../../internal/index.ts";

export interface UpsertCalibrationInput {
  key: string;
  value: number;
  trajectory?: CalibrationTrajectory;
}

export function updateCalibration(
  db: DatabaseHandle,
  entries: UpsertCalibrationInput[],
): CalibrationEntry[] {
  const now = Date.now();
  const results: CalibrationEntry[] = [];

  db.exec("BEGIN");
  try {
    for (const entry of entries) {
      const domain = entry.key.includes(".") ? entry.key.split(".")[0] : null;
      db.prepare(
        `INSERT INTO trail_calibration (key, value, domain, trajectory, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           domain = excluded.domain,
           trajectory = COALESCE(excluded.trajectory, trajectory),
           evidence_count = evidence_count + 1,
           updated_at = excluded.updated_at`,
      ).run(entry.key, entry.value, domain, entry.trajectory ?? "stable", now);

      const row = db.prepare("SELECT * FROM trail_calibration WHERE key = ?").get(entry.key);
      results.push(rowToCalibration(row as Record<string, unknown>));
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return results;
}
