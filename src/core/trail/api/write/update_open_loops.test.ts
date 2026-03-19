import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updateOpenLoops } from "./update_open_loops.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("updateOpenLoops", () => {
  it("creates new loops", () => {
    const results = updateOpenLoops(db, {
      create: [
        { description: "What about feature X?", significance: 0.8 },
        { description: "Revisit config", significance: 0.3 },
      ],
    });
    strictEqual(results.length, 2);
    strictEqual(results[0].status, "alive");
    strictEqual(results[0].significance, 0.8);
  });

  it("updates loop significance and status", () => {
    const [loop] = updateOpenLoops(db, {
      create: [{ description: "Loop 1" }],
    });
    const [updated] = updateOpenLoops(db, {
      update: [{ id: loop.id, significance: 0.9, status: "dormant" }],
    });
    strictEqual(updated.significance, 0.9);
    strictEqual(updated.status, "dormant");
  });

  it("dismisses loops by id", () => {
    const [loop] = updateOpenLoops(db, {
      create: [{ description: "To dismiss" }],
    });
    updateOpenLoops(db, { dismiss: [loop.id] });
    const row = db.prepare("SELECT status FROM trail_open_loops WHERE id = ?").get(loop.id) as {
      status: string;
    };
    strictEqual(row.status, "dismissed");
  });

  it("applies decay factor to active loops", () => {
    const [loop] = updateOpenLoops(db, {
      create: [{ description: "Decaying", significance: 1.0 }],
    });
    updateOpenLoops(db, { decay: { factor: 0.9 } });
    const row = db
      .prepare("SELECT significance FROM trail_open_loops WHERE id = ?")
      .get(loop.id) as { significance: number };
    ok(Math.abs(row.significance - 0.9) < 0.001, "significance should be decayed");
  });

  it("prunes excess loops beyond storage limit", () => {
    for (let i = 0; i < 5; i++) {
      updateOpenLoops(db, {
        create: [{ description: `Loop ${i}`, significance: i * 0.1 }],
      });
    }
    updateOpenLoops(db, { storageLimit: 3 });
    const row = db
      .prepare("SELECT COUNT(*) AS c FROM trail_open_loops WHERE status IN ('alive', 'dormant')")
      .get() as { c: number };
    strictEqual(row.c, 3, "should prune to storage limit");
  });
});
