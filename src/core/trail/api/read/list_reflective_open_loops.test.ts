import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { listReflectiveOpenLoops } from "./list_reflective_open_loops.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listReflectiveOpenLoops", () => {
  it("returns empty when no reflective loops exist", () => {
    strictEqual(listReflectiveOpenLoops(db).length, 0);
  });

  it("includes loops with reflective actions and sufficient significance", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Reflective", significance: 0.7, recommendedAction: "ask" },
        { description: "Non-reflective", significance: 0.7, recommendedAction: "wait" },
        { description: "Low sig", significance: 0.1, recommendedAction: "ask" },
      ],
    });
    const loops = listReflectiveOpenLoops(db);
    strictEqual(loops.length, 1);
    strictEqual(loops[0].description, "Reflective");
  });
});
