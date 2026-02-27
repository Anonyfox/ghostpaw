import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { countMemories } from "./count_memories.ts";
import { embedText } from "./embed_text.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("countMemories", () => {
  it("returns zero counts for empty database", () => {
    const counts = countMemories(db);
    strictEqual(counts.active, 0);
    strictEqual(counts.total, 0);
  });

  it("counts stored memories correctly", () => {
    storeMemory(db, "a", embedText("t"));
    storeMemory(db, "b", embedText("t"));
    storeMemory(db, "c", embedText("t"));
    const counts = countMemories(db);
    strictEqual(counts.active, 3);
    strictEqual(counts.total, 3);
  });

  it("distinguishes active from superseded", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    storeMemory(db, "c", embedText("t"));
    supersedeMemories(db, [a.id], b.id);
    const counts = countMemories(db);
    strictEqual(counts.active, 2);
    strictEqual(counts.total, 3);
  });
});
