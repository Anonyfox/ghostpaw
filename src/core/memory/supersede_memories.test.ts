import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { getMemory } from "./get_memory.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("supersedeMemories", () => {
  it("supersedes a single memory with a replacement", () => {
    const old = storeMemory(db, "old", embedText("t"));
    const replacement = storeMemory(db, "new", embedText("t"));
    supersedeMemories(db, [old.id], replacement.id);
    const fetched = getMemory(db, old.id);
    strictEqual(fetched?.supersededBy, replacement.id);
  });

  it("self-references when no replacement is given (forget)", () => {
    const mem = storeMemory(db, "forgotten", embedText("t"));
    supersedeMemories(db, [mem.id]);
    const fetched = getMemory(db, mem.id);
    strictEqual(fetched?.supersededBy, mem.id);
  });

  it("supersedes multiple memories at once", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    const merged = storeMemory(db, "merged", embedText("t"));
    supersedeMemories(db, [a.id, b.id], merged.id);
    strictEqual(getMemory(db, a.id)?.supersededBy, merged.id);
    strictEqual(getMemory(db, b.id)?.supersededBy, merged.id);
  });

  it("throws if a memory is not found", () => {
    throws(() => supersedeMemories(db, [999]), /not found/);
  });

  it("throws if a memory is already superseded", () => {
    const mem = storeMemory(db, "x", embedText("t"));
    supersedeMemories(db, [mem.id]);
    throws(() => supersedeMemories(db, [mem.id]), /already superseded/);
  });

  it("rolls back transaction on error (atomicity)", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    supersedeMemories(db, [b.id]);
    throws(() => supersedeMemories(db, [a.id, b.id]));
    strictEqual(getMemory(db, a.id)?.supersededBy, null);
  });

  it("handles empty array gracefully", () => {
    supersedeMemories(db, []);
  });

  it("throws when replacedById is in the ids array", () => {
    const a = storeMemory(db, "a", embedText("t"));
    const b = storeMemory(db, "b", embedText("t"));
    throws(() => supersedeMemories(db, [a.id, b.id], a.id), /cannot also be in the superseded set/);
  });
});
