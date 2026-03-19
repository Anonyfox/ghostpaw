import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { confirmMemory } from "./confirm_memory.ts";
import { embedText } from "./embed_text.ts";
import { initMemoryTable } from "./schema.ts";
import { staleMemories } from "./stale_memories.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

const MS_PER_DAY = 86_400_000;

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("staleMemories", () => {
  it("returns empty for empty database", () => {
    const result = staleMemories(db);
    strictEqual(result.length, 0);
  });

  it("ranks high-evidence old memories before low-evidence old memories", () => {
    storeMemory(db, "low evidence", embedText("t"));
    const highEvidence = storeMemory(db, "high evidence", embedText("t"));

    for (let i = 0; i < 5; i++) confirmMemory(db, highEvidence.id);

    const past = Date.now() - MS_PER_DAY * 60;
    db.prepare("UPDATE memories SET verified_at = ?").run(past);

    const result = staleMemories(db);
    ok(result.length >= 2);
    strictEqual(result[0].claim, "high evidence");
  });

  it("excludes superseded memories", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    supersedeMemories(db, [a.id], b.id);
    const result = staleMemories(db);
    for (const m of result) {
      ok(m.supersededBy === null, "should not include superseded memories");
    }
  });

  it("respects limit", () => {
    for (let i = 0; i < 20; i++) {
      storeMemory(db, `mem ${i}`, embedText("t"));
    }
    const result = staleMemories(db, 5);
    strictEqual(result.length, 5);
  });

  it("recently verified memories rank lower", () => {
    const old = storeMemory(db, "old verified", embedText("t"));
    storeMemory(db, "fresh verified", embedText("t"));

    const longAgo = Date.now() - MS_PER_DAY * 120;
    db.prepare("UPDATE memories SET verified_at = ? WHERE id = ?").run(longAgo, old.id);

    const result = staleMemories(db);
    ok(result.length >= 2);
    strictEqual(result[0].claim, "old verified");
  });
});
