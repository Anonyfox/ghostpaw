import type { DatabaseHandle } from "../../../../lib/index.ts";
import { getCalibrationByKey } from "./get_calibration.ts";

export type HowlMode = "gentle" | "direct" | "playful" | "serious";

export function getPreferredHowlMode(db: DatabaseHandle): HowlMode {
  const entry = getCalibrationByKey(db, "howl.preferred_mode", 0);
  const map: Record<number, HowlMode> = { 0: "gentle", 1: "direct", 2: "playful", 3: "serious" };
  return map[Math.round(entry.value)] ?? "gentle";
}
