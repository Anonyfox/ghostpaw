import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { embedText } from "./embed_text.ts";
import { initMemoryTable } from "./schema.ts";
import { searchMemories } from "./search_memories.ts";
import { storeMemory } from "./store_memory.ts";
import { supersedeMemories } from "./supersede_memories.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initMemoryTable(db);
});

describe("searchMemories", () => {
  it("finds relevant memories by semantic similarity", () => {
    storeMemory(db, "user loves pizza", embedText("user loves pizza"));
    storeMemory(db, "quantum mechanics equations", embedText("quantum mechanics equations"));
    const results = searchMemories(db, embedText("what food does the user like"));
    ok(results.length >= 1);
    strictEqual(results[0].claim, "user loves pizza");
  });

  it("returns empty for empty store", () => {
    const results = searchMemories(db, embedText("anything"));
    strictEqual(results.length, 0);
  });

  it("excludes superseded memories", () => {
    const old = storeMemory(db, "user likes tea", embedText("user likes tea"));
    const newer = storeMemory(db, "user likes coffee", embedText("user likes coffee"));
    supersedeMemories(db, [old.id], newer.id);
    const results = searchMemories(db, embedText("what does user drink"));
    for (const r of results) {
      ok(r.supersededBy === null, "should not include superseded memories");
    }
  });

  it("ranking respects confidence", () => {
    storeMemory(db, "low confidence claim", embedText("the sky is blue"), {
      confidence: 0.1,
    });
    storeMemory(db, "high confidence claim", embedText("the sky is blue"), {
      confidence: 0.95,
    });
    const results = searchMemories(db, embedText("the sky is blue"));
    ok(results.length >= 2);
    ok(
      results[0].confidence > results[1].confidence,
      "higher confidence should rank first when similarity is equal",
    );
  });

  it("includes score and similarity fields", () => {
    storeMemory(db, "test memory", embedText("test memory"));
    const results = searchMemories(db, embedText("test memory"));
    ok(results.length >= 1);
    ok(typeof results[0].score === "number");
    ok(typeof results[0].similarity === "number");
    ok(results[0].similarity > 0);
    ok(results[0].score > 0);
  });

  it("respects minScore filter", () => {
    storeMemory(db, "unrelated stuff", embedText("quantum physics black holes"));
    const results = searchMemories(db, embedText("pizza recipe"), { minScore: 0.5 });
    strictEqual(results.length, 0);
  });

  it("respects category filter", () => {
    storeMemory(db, "likes pizza", embedText("likes pizza"), { category: "preference" });
    storeMemory(db, "pizza is food", embedText("pizza is food"), { category: "fact" });
    const results = searchMemories(db, embedText("pizza"), { category: "preference" });
    for (const r of results) {
      strictEqual(r.category, "preference");
    }
  });

  it("respects k limit", () => {
    for (let i = 0; i < 20; i++) {
      storeMemory(db, `memory ${i}`, embedText(`memory about topic ${i}`));
    }
    const results = searchMemories(db, embedText("memory about topic"), { k: 5 });
    ok(results.length <= 5);
  });

  it("returns empty when query is a zero vector", () => {
    storeMemory(db, "something", embedText("something"));
    const zeros = new Array(256).fill(0);
    const results = searchMemories(db, zeros);
    strictEqual(results.length, 0);
  });

  it("clamps negative k to 1", () => {
    storeMemory(db, "test", embedText("test"));
    const results = searchMemories(db, embedText("test"), { k: -5 });
    ok(results.length <= 1);
  });

  it("handles 1000 entries in under 100ms", () => {
    for (let i = 0; i < 1000; i++) {
      storeMemory(db, `bulk memory ${i}`, embedText(`bulk memory content number ${i}`));
    }
    const query = embedText("bulk memory content");
    const start = performance.now();
    const results = searchMemories(db, query);
    const elapsed = performance.now() - start;
    ok(results.length > 0, "should return results");
    ok(elapsed < 100, `search took ${elapsed.toFixed(1)}ms, expected <100ms`);
  });
});
