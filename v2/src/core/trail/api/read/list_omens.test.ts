import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { resolveOmens } from "../write/resolve_omens.ts";
import { writeOmens } from "../write/write_omens.ts";
import { listOmens } from "./list_omens.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listOmens", () => {
  it("returns empty when none exist", () => {
    strictEqual(listOmens(db).length, 0);
  });

  it("returns only unresolved by default", () => {
    const [omen] = writeOmens(db, [
      { forecast: "F1", confidence: 0.5 },
      { forecast: "F2", confidence: 0.8 },
    ]);
    resolveOmens(db, [{ id: omen.id, outcome: "done" }]);
    strictEqual(listOmens(db).length, 1);
  });

  it("includes resolved when requested", () => {
    const [omen] = writeOmens(db, [
      { forecast: "F1", confidence: 0.5 },
      { forecast: "F2", confidence: 0.8 },
    ]);
    resolveOmens(db, [{ id: omen.id, outcome: "done" }]);
    strictEqual(listOmens(db, { includeResolved: true }).length, 2);
  });
});
