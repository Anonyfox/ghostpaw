import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import {
  MEMORY_CATEGORIES,
  MEMORY_SOURCES,
  type Memory,
  type MemoryCategory,
  type MemorySource,
  type RankedMemory,
} from "./types.ts";

describe("MEMORY_SOURCES", () => {
  it("contains all four source types in order", () => {
    deepStrictEqual([...MEMORY_SOURCES], ["explicit", "observed", "distilled", "inferred"]);
  });

  it("is a readonly tuple that supports type narrowing", () => {
    const src: MemorySource = MEMORY_SOURCES[0];
    strictEqual(src, "explicit");
  });
});

describe("MEMORY_CATEGORIES", () => {
  it("contains all five category types in order", () => {
    deepStrictEqual(
      [...MEMORY_CATEGORIES],
      ["preference", "fact", "procedure", "capability", "custom"],
    );
  });

  it("is a readonly tuple that supports type narrowing", () => {
    const cat: MemoryCategory = MEMORY_CATEGORIES[4];
    strictEqual(cat, "custom");
  });
});

describe("Memory interface", () => {
  it("accepts a well-formed memory object", () => {
    const mem: Memory = {
      id: 1,
      claim: "User prefers TypeScript",
      confidence: 0.85,
      evidenceCount: 3,
      createdAt: 1700000000000,
      verifiedAt: 1700000000000,
      source: "explicit",
      category: "preference",
      supersededBy: null,
    };
    strictEqual(mem.id, 1);
    strictEqual(mem.supersededBy, null);
  });

  it("accepts a superseded memory", () => {
    const mem: Memory = {
      id: 2,
      claim: "Old fact",
      confidence: 0.5,
      evidenceCount: 1,
      createdAt: 1700000000000,
      verifiedAt: 1700000000000,
      source: "distilled",
      category: "fact",
      supersededBy: 5,
    };
    strictEqual(mem.supersededBy, 5);
  });
});

describe("RankedMemory interface", () => {
  it("extends Memory with score and similarity fields", () => {
    const ranked: RankedMemory = {
      id: 1,
      claim: "Test",
      confidence: 0.9,
      evidenceCount: 2,
      createdAt: 1700000000000,
      verifiedAt: 1700000000000,
      source: "observed",
      category: "fact",
      supersededBy: null,
      score: 0.75,
      similarity: 0.88,
    };
    ok(ranked.score <= ranked.similarity);
    strictEqual(typeof ranked.score, "number");
    strictEqual(typeof ranked.similarity, "number");
  });
});
