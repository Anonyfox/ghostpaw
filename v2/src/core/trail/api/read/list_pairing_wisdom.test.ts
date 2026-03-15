import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updatePairingWisdom } from "../write/update_pairing_wisdom.ts";
import { listPairingWisdom } from "./list_pairing_wisdom.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("listPairingWisdom", () => {
  it("returns empty when none exist", () => {
    strictEqual(listPairingWisdom(db).length, 0);
  });

  it("filters by category", () => {
    updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "p", guidance: "g" },
        { category: "timing", pattern: "p", guidance: "g" },
      ],
    });
    const results = listPairingWisdom(db, { category: "tone" });
    strictEqual(results.length, 1);
    strictEqual(results[0].category, "tone");
  });

  it("filters by minimum confidence", () => {
    updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "p", guidance: "g", confidence: 0.2 },
        { category: "tone", pattern: "p2", guidance: "g2", confidence: 0.8 },
      ],
    });
    const results = listPairingWisdom(db, { minConfidence: 0.5 });
    strictEqual(results.length, 1);
  });
});
