import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { heavilyRevisedMemories, memoryRevisionChain } from "./memory_revision_chain.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

describe("memoryRevisionChain", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("returns single-element chain for memory with no revisions", () => {
    const m = storeMemory(db, "Standalone", embedText("standalone"));
    const chain = memoryRevisionChain(db, m.id);
    strictEqual(chain.length, 1);
    strictEqual(chain[0].id, m.id);
  });

  it("returns full chain for a revised memory", () => {
    const m1 = storeMemory(db, "Version 1", embedText("v1"));
    const m2 = storeMemory(db, "Version 2", embedText("v2"));
    supersedeMemories(db, [m1.id], m2.id);

    const chain = memoryRevisionChain(db, m2.id);
    strictEqual(chain.length, 2);
    strictEqual(chain[0].claim, "Version 1");
    strictEqual(chain[1].claim, "Version 2");
  });

  it("follows forward chain from an old memory", () => {
    const m1 = storeMemory(db, "Original", embedText("orig"));
    const m2 = storeMemory(db, "Updated", embedText("updated"));
    supersedeMemories(db, [m1.id], m2.id);

    const chain = memoryRevisionChain(db, m1.id);
    strictEqual(chain.length, 2);
    strictEqual(chain[0].claim, "Original");
    strictEqual(chain[1].claim, "Updated");
  });
});

describe("heavilyRevisedMemories", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("returns empty when no revisions exist", () => {
    storeMemory(db, "No revisions", embedText("none"));
    strictEqual(heavilyRevisedMemories(db).length, 0);
  });

  it("finds memories that replaced 2+ others", () => {
    const m1 = storeMemory(db, "Old v1", embedText("old1"));
    const m2 = storeMemory(db, "Old v2", embedText("old2"));
    const m3 = storeMemory(db, "Current", embedText("current"));
    supersedeMemories(db, [m1.id], m3.id);
    supersedeMemories(db, [m2.id], m3.id);

    const result = heavilyRevisedMemories(db);
    strictEqual(result.length, 1);
    strictEqual(result[0].claim, "Current");
    ok(result[0].revisionDepth >= 2);
  });

  it("ignores memories with only one predecessor", () => {
    const m1 = storeMemory(db, "Old", embedText("old"));
    const m2 = storeMemory(db, "New", embedText("new"));
    supersedeMemories(db, [m1.id], m2.id);

    strictEqual(heavilyRevisedMemories(db).length, 0);
  });
});
