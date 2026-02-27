import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { listMemories } from "./list_memories.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("listMemories", () => {
  it("returns all active memories", () => {
    storeMemory(db, "a", embedText("t"));
    storeMemory(db, "b", embedText("t"));
    const list = listMemories(db);
    strictEqual(list.length, 2);
  });

  it("excludes superseded memories by default", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    supersedeMemories(db, [a.id], b.id);
    const list = listMemories(db);
    strictEqual(list.length, 1);
    strictEqual(list[0].claim, "b");
  });

  it("includes superseded memories when requested", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    supersedeMemories(db, [a.id], b.id);
    const list = listMemories(db, { includeSuperseded: true });
    strictEqual(list.length, 2);
  });

  it("filters by category", () => {
    storeMemory(db, "pref", embedText("t"), { category: "preference" });
    storeMemory(db, "fact", embedText("t"), { category: "fact" });
    const list = listMemories(db, { category: "preference" });
    strictEqual(list.length, 1);
    strictEqual(list[0].category, "preference");
  });

  it("filters by minConfidence", () => {
    storeMemory(db, "low", embedText("t"), { source: "inferred" });
    storeMemory(db, "high", embedText("t"), { source: "explicit" });
    const list = listMemories(db, { minConfidence: 0.8 });
    strictEqual(list.length, 1);
    strictEqual(list[0].claim, "high");
  });

  it("respects limit", () => {
    for (let i = 0; i < 5; i++) storeMemory(db, `m${i}`, embedText("t"));
    const list = listMemories(db, { limit: 3 });
    strictEqual(list.length, 3);
  });

  it("respects offset", () => {
    for (let i = 0; i < 5; i++) storeMemory(db, `m${i}`, embedText("t"));
    const list = listMemories(db, { limit: 2, offset: 3 });
    strictEqual(list.length, 2);
  });

  it("returns empty array when no memories exist", () => {
    const list = listMemories(db);
    strictEqual(list.length, 0);
  });

  it("clamps negative limit to 0 (returns empty)", () => {
    storeMemory(db, "a", embedText("t"));
    const list = listMemories(db, { limit: -1 });
    strictEqual(list.length, 0);
  });

  it("clamps negative offset to 0", () => {
    storeMemory(db, "a", embedText("t"));
    const list = listMemories(db, { offset: -5 });
    strictEqual(list.length, 1);
  });
});
