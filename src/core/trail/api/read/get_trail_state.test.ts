import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { getTrailState } from "./get_trail_state.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getTrailState", () => {
  it("returns stable momentum with no data", () => {
    const state = getTrailState(db);
    strictEqual(state.chapter, null);
    strictEqual(state.momentum, "stable");
    strictEqual(state.recentTrailmarks.length, 0);
  });

  it("reflects current chapter momentum", () => {
    updateTrailState(db, {
      createChapter: { label: "Ch", momentum: "rising" },
      trailmarks: [{ kind: "milestone", description: "m1" }],
    });
    const state = getTrailState(db);
    strictEqual(state.momentum, "rising");
    strictEqual(state.recentTrailmarks.length, 1);
  });
});
