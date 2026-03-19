// TODO(calibration-consumption): Calibration coefficients are written by the historian
// nightly and read by getOutreachPolicy, shouldSurfaceHowl, and getPreferredHowlMode.
// Remaining consumers to wire:
// - planning.duration_multiplier → planning/estimation code paths (when they exist)
// - initiative.proactivity_threshold → haunt and howl initiative gating
// - timing.morning_quality / timing.response_delay → session-aware timing decisions
// - getPreferredHowlMode → howl tool (not yet consumed)
// These close the self-improving feedback loop where the historian's observations
// directly change runtime behavior without additional LLM calls.
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { CalibrationEntry } from "../../internal/index.ts";
import { rowToCalibration } from "../../internal/index.ts";

export function getCalibrationByKey(
  db: DatabaseHandle,
  key: string,
  fallback?: number,
): CalibrationEntry | { key: string; value: number } {
  const row = db.prepare("SELECT * FROM trail_calibration WHERE key = ?").get(key) as
    | Record<string, unknown>
    | undefined;
  if (row) return rowToCalibration(row);
  if (fallback !== undefined) return { key, value: fallback };
  return { key, value: 1.0 };
}

export function getCalibrationByDomain(db: DatabaseHandle, domain: string): CalibrationEntry[] {
  const rows = db.prepare("SELECT * FROM trail_calibration WHERE domain = ?").all(domain) as Record<
    string,
    unknown
  >[];
  return rows.map(rowToCalibration);
}

export function getAllCalibration(db: DatabaseHandle): CalibrationEntry[] {
  const rows = db.prepare("SELECT * FROM trail_calibration ORDER BY key").all() as Record<
    string,
    unknown
  >[];
  return rows.map(rowToCalibration);
}
