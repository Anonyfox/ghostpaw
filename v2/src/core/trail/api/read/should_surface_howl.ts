import type { DatabaseHandle } from "../../../../lib/index.ts";
import { getCalibrationByKey } from "./get_calibration.ts";

export interface HowlSurfaceDecision {
  shouldSurface: boolean;
  confidence: number;
}

export function shouldSurfaceHowl(db: DatabaseHandle): HowlSurfaceDecision {
  const entry = getCalibrationByKey(db, "howl.surface_probability", 0.5);
  return {
    shouldSurface: entry.value >= 0.3,
    confidence: entry.value,
  };
}
