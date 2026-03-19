import { ok, strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { ftsSearch } from "./fts_search.ts";
import { initMemoryTable } from "./schema.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

describe("ftsSearch", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initMemoryTable(db);
  });

  afterEach(() => db.close());

  it("finds memories by term matching", () => {
    storeMemory(db, "The user loves pizza", embedText("The user loves pizza"), {
      source: "explicit",
    });
    storeMemory(db, "Deploy command is make deploy", embedText("Deploy command is make deploy"), {
      source: "observed",
    });
    const results = ftsSearch(db, "pizza");
    strictEqual(results.length, 1);
    ok(results[0].claim.includes("pizza"));
  });

  it("returns multiple matches ranked by relevance", () => {
    storeMemory(db, "The user loves pizza with extra cheese", embedText("pizza cheese"), {
      source: "explicit",
    });
    storeMemory(db, "Pizza is the best food ever", embedText("pizza best food"), {
      source: "observed",
    });
    storeMemory(db, "Deploy uses docker compose", embedText("deploy docker"), {
      source: "inferred",
    });
    const results = ftsSearch(db, "pizza food");
    ok(results.length >= 2);
  });

  it("excludes superseded memories", () => {
    const mem = storeMemory(db, "Old pizza fact", embedText("Old pizza fact"), {
      source: "explicit",
    });
    supersedeMemories(db, [mem.id]);
    const results = ftsSearch(db, "pizza");
    strictEqual(results.length, 0);
  });

  it("respects excludeIds", () => {
    const m1 = storeMemory(db, "Pizza preference", embedText("Pizza preference"), {
      source: "explicit",
    });
    storeMemory(db, "Pizza is great", embedText("Pizza is great"), { source: "observed" });
    const results = ftsSearch(db, "pizza", { excludeIds: [m1.id] });
    ok(results.every((r) => r.id !== m1.id));
  });

  it("respects category filter", () => {
    storeMemory(db, "User likes pizza", embedText("User likes pizza"), {
      source: "explicit",
      category: "preference",
    });
    storeMemory(db, "Pizza recipe step one", embedText("Pizza recipe"), {
      source: "observed",
      category: "procedure",
    });
    const results = ftsSearch(db, "pizza", { category: "preference" });
    strictEqual(results.length, 1);
    strictEqual(results[0].category, "preference");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      storeMemory(db, `Pizza fact number ${i}`, embedText(`Pizza fact ${i}`), {
        source: "explicit",
      });
    }
    const results = ftsSearch(db, "pizza", { limit: 3 });
    strictEqual(results.length, 3);
  });

  it("returns empty array when no terms match", () => {
    storeMemory(db, "User likes pizza", embedText("User likes pizza"), { source: "explicit" });
    const results = ftsSearch(db, "quantum entanglement");
    strictEqual(results.length, 0);
  });

  it("returns empty array for query with only short tokens", () => {
    storeMemory(db, "User likes pizza", embedText("User likes pizza"), { source: "explicit" });
    const results = ftsSearch(db, "I a");
    strictEqual(results.length, 0);
  });

  it("includes embedding blob in results", () => {
    storeMemory(db, "Pizza preference", embedText("Pizza preference"), { source: "explicit" });
    const results = ftsSearch(db, "pizza");
    ok(results[0].embedding instanceof Uint8Array);
    ok(results[0].embedding.byteLength > 0);
  });

  it("returns all expected fields", () => {
    storeMemory(db, "Test memory for fields", embedText("Test memory"), {
      source: "explicit",
      category: "fact",
    });
    const results = ftsSearch(db, "test memory");
    strictEqual(results.length, 1);
    const hit = results[0];
    strictEqual(typeof hit.id, "number");
    strictEqual(typeof hit.claim, "string");
    strictEqual(typeof hit.confidence, "number");
    strictEqual(typeof hit.evidenceCount, "number");
    strictEqual(typeof hit.verifiedAt, "number");
    strictEqual(hit.source, "explicit");
    strictEqual(hit.category, "fact");
  });
});
