import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { getMemory } from "./get_memory.ts";
import { removeMemory } from "./remove_memory.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("removeMemory", () => {
  it("deletes a memory by ID", () => {
    const mem = storeMemory(db, "gone", embedText("t"));
    removeMemory(db, mem.id);
    strictEqual(getMemory(db, mem.id), null);
  });

  it("is idempotent (no error on missing ID)", () => {
    removeMemory(db, 999);
  });

  it("clears superseded_by references pointing to the deleted ID", () => {
    const old = storeMemory(db, "old", embedText("t"));
    const replacement = storeMemory(db, "new", embedText("t"));
    supersedeMemories(db, [old.id], replacement.id);
    strictEqual(getMemory(db, old.id)?.supersededBy, replacement.id);

    removeMemory(db, replacement.id);
    const restored = getMemory(db, old.id);
    strictEqual(restored?.supersededBy, null);
  });

  it("does not affect other memories", () => {
    const keep = storeMemory(db, "keep", embedText("t"));
    const remove = storeMemory(db, "remove", embedText("t"));
    removeMemory(db, remove.id);
    strictEqual(getMemory(db, keep.id)?.claim, "keep");
  });
});
