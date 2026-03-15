import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "../write/update_open_loops.ts";
import { listOpenLoops } from "./list_open_loops.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listOpenLoops", () => {
  it("returns empty when none exist", () => {
    strictEqual(listOpenLoops(db).length, 0);
  });

  it("returns alive loops sorted by significance desc", () => {
    updateOpenLoops(db, {
      create: [
        { description: "Low", significance: 0.2 },
        { description: "High", significance: 0.9 },
      ],
    });
    const loops = listOpenLoops(db);
    strictEqual(loops[0].description, "High");
  });

  it("respects display cap of 7", () => {
    for (let i = 0; i < 10; i++) {
      updateOpenLoops(db, { create: [{ description: `L${i}` }] });
    }
    strictEqual(listOpenLoops(db).length, 7);
  });

  it("can filter by status", () => {
    updateOpenLoops(db, { create: [{ description: "A" }] });
    const [loop] = updateOpenLoops(db, { create: [{ description: "B" }] });
    updateOpenLoops(db, { update: [{ id: loop.id, status: "dormant" }] });
    strictEqual(listOpenLoops(db, { status: "dormant" }).length, 1);
  });
});
