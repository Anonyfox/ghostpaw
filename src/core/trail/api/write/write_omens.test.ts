import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { writeOmens } from "./write_omens.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("writeOmens", () => {
  it("inserts a single omen", () => {
    const [omen] = writeOmens(db, [{ forecast: "User will return tomorrow", confidence: 0.8 }]);
    strictEqual(omen.forecast, "User will return tomorrow");
    strictEqual(omen.confidence, 0.8);
    strictEqual(omen.resolvedAt, null);
    ok(omen.createdAt > 0);
  });

  it("inserts multiple omens with horizon", () => {
    const horizon = Date.now() + 86_400_000;
    const results = writeOmens(db, [
      { forecast: "F1", confidence: 0.5, horizon },
      { forecast: "F2", confidence: 0.9 },
    ]);
    strictEqual(results.length, 2);
    strictEqual(results[0].horizon, horizon);
    strictEqual(results[1].horizon, null);
  });
});
