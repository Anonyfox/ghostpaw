import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { resolveOmens } from "./resolve_omens.ts";
import { writeOmens } from "./write_omens.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("resolveOmens", () => {
  it("resolves an omen with outcome and error", () => {
    const [omen] = writeOmens(db, [{ forecast: "User will ask about feature X", confidence: 0.7 }]);
    const [resolved] = resolveOmens(db, [
      { id: omen.id, outcome: "User asked about Y instead", predictionError: 0.6 },
    ]);
    strictEqual(resolved.outcome, "User asked about Y instead");
    strictEqual(resolved.predictionError, 0.6);
    ok(resolved.resolvedAt !== null && resolved.resolvedAt > 0);
  });

  it("handles multiple resolutions", () => {
    const omens = writeOmens(db, [
      { forecast: "F1", confidence: 0.5 },
      { forecast: "F2", confidence: 0.8 },
    ]);
    const resolved = resolveOmens(db, [
      { id: omens[0].id, outcome: "O1" },
      { id: omens[1].id, outcome: "O2", predictionError: 0.1 },
    ]);
    strictEqual(resolved.length, 2);
    strictEqual(resolved[1].predictionError, 0.1);
  });
});
