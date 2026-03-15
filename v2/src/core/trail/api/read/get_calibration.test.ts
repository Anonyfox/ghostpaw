import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateCalibration } from "../write/update_calibration.ts";
import {
  getAllCalibration,
  getCalibrationByDomain,
  getCalibrationByKey,
} from "./get_calibration.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getCalibration", () => {
  it("fails open with default value when key missing", () => {
    const entry = getCalibrationByKey(db, "missing.key");
    strictEqual(entry.value, 1.0);
  });

  it("returns stored value when key exists", () => {
    updateCalibration(db, [{ key: "planning.multiplier", value: 1.5 }]);
    const entry = getCalibrationByKey(db, "planning.multiplier");
    strictEqual(entry.value, 1.5);
  });

  it("getCalibrationByDomain filters by domain", () => {
    updateCalibration(db, [
      { key: "planning.a", value: 1 },
      { key: "planning.b", value: 2 },
      { key: "timing.c", value: 3 },
    ]);
    const results = getCalibrationByDomain(db, "planning");
    strictEqual(results.length, 2);
  });

  it("getAllCalibration returns all entries", () => {
    updateCalibration(db, [
      { key: "a.x", value: 1 },
      { key: "b.y", value: 2 },
    ]);
    strictEqual(getAllCalibration(db).length, 2);
  });
});
