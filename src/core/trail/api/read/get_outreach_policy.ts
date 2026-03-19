import type { DatabaseHandle } from "../../../../lib/index.ts";
import { getCalibrationByKey } from "./get_calibration.ts";

export interface OutreachPolicy {
  proactivity: number;
  minGapMs: number;
  maxDailyOutreach: number;
  preferredTimeWindow: string;
}

function val(db: DatabaseHandle, key: string, fallback: number): number {
  const entry = getCalibrationByKey(db, key, fallback);
  return entry.value;
}

export function getOutreachPolicy(db: DatabaseHandle): OutreachPolicy {
  return {
    proactivity: val(db, "initiative.proactivity", 0.5),
    minGapMs: val(db, "timing.min_gap_ms", 3_600_000),
    maxDailyOutreach: val(db, "initiative.max_daily_outreach", 3),
    preferredTimeWindow: "any",
  };
}
