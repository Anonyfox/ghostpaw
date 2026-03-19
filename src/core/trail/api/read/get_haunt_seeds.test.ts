import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { getHauntSeeds } from "./get_haunt_seeds.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("getHauntSeeds", () => {
  it("returns empty when no loops exist", () => {
    strictEqual(getHauntSeeds(db).length, 0);
  });

  it("filters by significance threshold", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Low", significance: 0.2 },
        { description: "High", significance: 0.8 },
      ],
    });
    const seeds = getHauntSeeds(db);
    strictEqual(seeds.length, 1);
    strictEqual(seeds[0].description, "High");
  });

  it("excludes loops with future resurface date", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Future", significance: 0.9, earliestResurface: Date.now() + 86_400_000 },
      ],
    });
    strictEqual(getHauntSeeds(db).length, 0);
  });
});
