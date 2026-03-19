import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../../../lib/index.ts";
import { initMemoryTable } from "../../schema.ts";
import { storeMemory } from "../write/store_memory.ts";
import { topBeliefs } from "./top_beliefs.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("topBeliefs", () => {
  it("returns empty array when no memories exist", () => {
    strictEqual(topBeliefs(db).length, 0);
  });

  it("excludes memories below the confidence threshold", () => {
    storeMemory(db, "weak belief", { confidence: 0.3 });
    storeMemory(db, "moderate belief", { confidence: 0.5 });
    strictEqual(topBeliefs(db).length, 0);
  });

  it("returns high-confidence memories ordered by evidence count", () => {
    const m1 = storeMemory(db, "often confirmed", { confidence: 0.9 });
    storeMemory(db, "also strong", { confidence: 0.8 });

    db.prepare("UPDATE memories SET evidence_count = 5 WHERE id = ?").run(m1.id);

    const results = topBeliefs(db);
    strictEqual(results.length, 2);
    strictEqual(results[0].id, m1.id);
  });

  it("respects the limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      storeMemory(db, `belief ${i}`, { confidence: 0.9 });
    }
    strictEqual(topBeliefs(db, 3).length, 3);
  });

  it("defaults to 5 results", () => {
    for (let i = 0; i < 8; i++) {
      storeMemory(db, `belief ${i}`, { confidence: 0.9 });
    }
    strictEqual(topBeliefs(db).length, 5);
  });

  it("excludes superseded memories", () => {
    const m1 = storeMemory(db, "old belief", { confidence: 0.9 });
    const m2 = storeMemory(db, "new belief", { confidence: 0.9 });
    db.prepare("UPDATE memories SET superseded_by = ? WHERE id = ?").run(m2.id, m1.id);
    strictEqual(topBeliefs(db).length, 1);
  });
});
