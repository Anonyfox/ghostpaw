import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateCalibration } from "./update_calibration.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("updateCalibration", () => {
  it("inserts a new calibration entry", () => {
    const [result] = updateCalibration(db, [{ key: "planning.duration_multiplier", value: 1.3 }]);
    strictEqual(result.key, "planning.duration_multiplier");
    strictEqual(result.value, 1.3);
    strictEqual(result.domain, "planning");
    strictEqual(result.evidenceCount, 1);
  });

  it("upserts on duplicate key and increments evidence", () => {
    updateCalibration(db, [{ key: "timing.response_delay", value: 2.0 }]);
    const [updated] = updateCalibration(db, [
      { key: "timing.response_delay", value: 2.5, trajectory: "rising" },
    ]);
    strictEqual(updated.value, 2.5);
    strictEqual(updated.evidenceCount, 2);
    strictEqual(updated.trajectory, "rising");
  });

  it("derives domain from key prefix", () => {
    const [result] = updateCalibration(db, [{ key: "initiative.proactivity", value: 0.7 }]);
    strictEqual(result.domain, "initiative");
  });

  it("handles keys without domain prefix", () => {
    const [result] = updateCalibration(db, [{ key: "standalone", value: 1.0 }]);
    strictEqual(result.domain, null);
  });
});
