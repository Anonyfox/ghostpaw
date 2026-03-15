import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateCalibration } from "../write/update_calibration.ts";
import { getPreferredHowlMode } from "./get_preferred_howl_mode.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getPreferredHowlMode", () => {
  it("returns gentle by default", () => {
    strictEqual(getPreferredHowlMode(db), "gentle");
  });

  it("returns direct when calibrated to 1", () => {
    updateCalibration(db, [{ key: "howl.preferred_mode", value: 1 }]);
    strictEqual(getPreferredHowlMode(db), "direct");
  });

  it("falls back to gentle for unknown values", () => {
    updateCalibration(db, [{ key: "howl.preferred_mode", value: 99 }]);
    strictEqual(getPreferredHowlMode(db), "gentle");
  });
});
