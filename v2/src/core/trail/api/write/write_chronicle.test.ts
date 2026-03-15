import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { writeChronicle } from "./write_chronicle.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("writeChronicle", () => {
  it("inserts a chronicle entry and returns it", () => {
    const result = writeChronicle(db, {
      date: "2026-03-10",
      title: "Day one",
      narrative: "Things happened.",
    });
    strictEqual(result.id, 1);
    strictEqual(result.date, "2026-03-10");
    strictEqual(result.title, "Day one");
    ok(result.createdAt > 0);
  });

  it("stores optional fields when provided", () => {
    const result = writeChronicle(db, {
      date: "2026-03-11",
      title: "Day two",
      narrative: "More things.",
      highlights: "A highlight",
      surprises: "A surprise",
      unresolved: "Something open",
      sourceSlices: '{"memory":true}',
    });
    strictEqual(result.highlights, "A highlight");
    strictEqual(result.surprises, "A surprise");
    strictEqual(result.unresolved, "Something open");
  });

  it("enforces unique date constraint", () => {
    writeChronicle(db, { date: "2026-03-10", title: "First", narrative: "n" });
    let threw = false;
    try {
      writeChronicle(db, { date: "2026-03-10", title: "Dupe", narrative: "n" });
    } catch {
      threw = true;
    }
    ok(threw, "should reject duplicate date");
  });
});
