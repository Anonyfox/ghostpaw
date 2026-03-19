import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateCalibration } from "../write/update_calibration.ts";
import { shouldSurfaceHowl } from "./should_surface_howl.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("shouldSurfaceHowl", () => {
  it("returns true by default (fail-open)", () => {
    const decision = shouldSurfaceHowl(db);
    strictEqual(decision.shouldSurface, true);
  });

  it("returns false when calibration is below threshold", () => {
    updateCalibration(db, [{ key: "howl.surface_probability", value: 0.1 }]);
    const decision = shouldSurfaceHowl(db);
    strictEqual(decision.shouldSurface, false);
  });
});
