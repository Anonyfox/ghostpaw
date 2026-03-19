import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initTrailTables } from "../../schema.ts";
import { updatePairingWisdom } from "./update_pairing_wisdom.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initTrailTables(db);
});

describe("updatePairingWisdom", () => {
  it("creates new wisdom entries", () => {
    const results = updatePairingWisdom(db, {
      create: [
        { category: "tone", pattern: "prefers direct", guidance: "be concise" },
        { category: "timing", pattern: "works late", guidance: "expect evening sessions" },
      ],
    });
    strictEqual(results.length, 2);
    strictEqual(results[0].category, "tone");
    strictEqual(results[0].evidenceCount, 1);
    strictEqual(results[0].confidence, 0.3);
  });

  it("revises existing wisdom and increments evidence", () => {
    const [created] = updatePairingWisdom(db, {
      create: [{ category: "framing", pattern: "old", guidance: "old guide" }],
    });
    const [revised] = updatePairingWisdom(db, {
      revise: [{ id: created.id, pattern: "new pattern", confidence: 0.8 }],
    });
    strictEqual(revised.pattern, "new pattern");
    strictEqual(revised.confidence, 0.8);
    strictEqual(revised.evidenceCount, 2);
  });

  it("confirms existing wisdom and increments hit count", () => {
    const [created] = updatePairingWisdom(db, {
      create: [{ category: "workflow", pattern: "p", guidance: "g" }],
    });
    const [confirmed] = updatePairingWisdom(db, { confirm: [created.id] });
    strictEqual(confirmed.hitCount, 1);
    strictEqual(confirmed.evidenceCount, 2);
  });
});
