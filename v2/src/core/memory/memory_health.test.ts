import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { memoryHealth } from "./memory_health.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

describe("memoryHealth", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("returns zeros for empty database", () => {
    const h = memoryHealth(db);
    strictEqual(h.active, 0);
    strictEqual(h.strong, 0);
    strictEqual(h.fading, 0);
    strictEqual(h.faint, 0);
    strictEqual(h.singleEvidence, 0);
    strictEqual(h.recentRevisions, 0);
  });

  it("classifies memories by confidence tier", () => {
    storeMemory(db, "Strong belief", embedText("strong"), { confidence: 0.9 });
    storeMemory(db, "Fading belief", embedText("fading"), { confidence: 0.5 });
    storeMemory(db, "Faint belief", embedText("faint"), { confidence: 0.2 });

    const h = memoryHealth(db);
    strictEqual(h.active, 3);
    strictEqual(h.strong, 1);
    strictEqual(h.fading, 1);
    strictEqual(h.faint, 1);
  });

  it("counts by source and category", () => {
    storeMemory(db, "User said so", embedText("explicit"), {
      source: "explicit",
      category: "preference",
    });
    storeMemory(db, "Saw it happen", embedText("observed"), {
      source: "observed",
      category: "fact",
    });

    const h = memoryHealth(db);
    strictEqual(h.bySource.explicit, 1);
    strictEqual(h.bySource.observed, 1);
    strictEqual(h.byCategory.preference, 1);
    strictEqual(h.byCategory.fact, 1);
  });

  it("tracks single-evidence memories and revisions", () => {
    const m1 = storeMemory(db, "Old claim", embedText("old"));
    const m2 = storeMemory(db, "New claim", embedText("new"));
    supersedeMemories(db, [m1.id], m2.id);

    const h = memoryHealth(db);
    strictEqual(h.active, 1);
    strictEqual(h.singleEvidence, 1);
    strictEqual(h.recentRevisions, 1);
  });
});
