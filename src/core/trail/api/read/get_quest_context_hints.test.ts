import { deepStrictEqual, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { updateTrailState } from "../write/update_trail_state.ts";
import { getQuestContextHints } from "./get_quest_context_hints.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getQuestContextHints", () => {
  it("returns empty hints when no trail data exists", () => {
    const hints = getQuestContextHints(db, 42);
    strictEqual(hints.chapter, null);
    deepStrictEqual(hints.linkedLoops, []);
  });

  it("returns current chapter", () => {
    updateTrailState(db, { createChapter: { label: "Phase One", momentum: "rising" } });
    const hints = getQuestContextHints(db, 1);
    strictEqual(hints.chapter?.label, "Phase One");
  });

  it("returns only loops linked to the given quest", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Quest 1 loop", sourceType: "quest", sourceId: "1", significance: 0.8 },
        { description: "Quest 2 loop", sourceType: "quest", sourceId: "2", significance: 0.7 },
        { description: "Unlinked loop", significance: 0.9 },
      ],
    });
    const hints = getQuestContextHints(db, 1);
    strictEqual(hints.linkedLoops.length, 1);
    strictEqual(hints.linkedLoops[0].description, "Quest 1 loop");
  });

  it("excludes dismissed loops", () => {
    const [loop] = updateOpenLoops(db, {
      create: [{ description: "Dismissed", sourceType: "quest", sourceId: "5" }],
    });
    updateOpenLoops(db, { dismiss: [loop.id] });
    const hints = getQuestContextHints(db, 5);
    strictEqual(hints.linkedLoops.length, 0);
  });
});
