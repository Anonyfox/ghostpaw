import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateCalibration } from "../write/update_calibration.ts";
import { getOutreachPolicy } from "./get_outreach_policy.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getOutreachPolicy", () => {
  it("returns fail-open defaults with no calibration data", () => {
    const p = getOutreachPolicy(db);
    strictEqual(p.proactivity, 0.5);
    strictEqual(p.maxDailyOutreach, 3);
  });

  it("reflects stored calibration values", () => {
    updateCalibration(db, [{ key: "initiative.proactivity", value: 0.8 }]);
    const p = getOutreachPolicy(db);
    strictEqual(p.proactivity, 0.8);
  });
});
