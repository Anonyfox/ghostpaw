import type { CalibrationEntry, CalibrationTrajectory } from "./types.ts";

export function rowToCalibration(row: Record<string, unknown>): CalibrationEntry {
  return {
    id: row.id as number,
    key: row.key as string,
    value: row.value as number,
    domain: (row.domain as string | null) ?? null,
    evidenceCount: row.evidence_count as number,
    trajectory: row.trajectory as CalibrationTrajectory,
    updatedAt: row.updated_at as number,
  };
}
