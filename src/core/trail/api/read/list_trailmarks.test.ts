import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { listTrailmarks } from "./list_trailmarks.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listTrailmarks", () => {
  it("returns empty when none exist", () => {
    strictEqual(listTrailmarks(db).length, 0);
  });

  it("returns trailmarks in reverse chronological order", () => {
    updateTrailState(db, {
      trailmarks: [
        { kind: "milestone", description: "First" },
        { kind: "shift", description: "Second" },
      ],
    });
    const marks = listTrailmarks(db);
    strictEqual(marks.length, 2);
  });

  it("respects limit", () => {
    updateTrailState(db, {
      trailmarks: [
        { kind: "first", description: "A" },
        { kind: "first", description: "B" },
        { kind: "first", description: "C" },
      ],
    });
    strictEqual(listTrailmarks(db, 2).length, 2);
  });
});
