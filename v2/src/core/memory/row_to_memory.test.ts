import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToMemory } from "./row_to_memory.ts";

describe("rowToMemory", () => {
  it("maps a complete SQL row to Memory", () => {
    const row = {
      id: 42,
      claim: "User prefers dark mode",
      confidence: 0.85,
      evidence_count: 3,
      created_at: 1700000000000,
      verified_at: 1700100000000,
      source: "explicit",
      category: "preference",
      superseded_by: null,
    };
    const mem = rowToMemory(row);
    deepStrictEqual(mem, {
      id: 42,
      claim: "User prefers dark mode",
      confidence: 0.85,
      evidenceCount: 3,
      createdAt: 1700000000000,
      verifiedAt: 1700100000000,
      source: "explicit",
      category: "preference",
      supersededBy: null,
    });
  });

  it("maps superseded_by when present", () => {
    const row = {
      id: 1,
      claim: "old fact",
      confidence: 0.5,
      evidence_count: 1,
      created_at: 1700000000000,
      verified_at: 1700000000000,
      source: "distilled",
      category: "fact",
      superseded_by: 99,
    };
    const mem = rowToMemory(row);
    strictEqual(mem.supersededBy, 99);
  });

  it("handles undefined superseded_by as null", () => {
    const row = {
      id: 1,
      claim: "test",
      confidence: 0.7,
      evidence_count: 1,
      created_at: 1700000000000,
      verified_at: 1700000000000,
      source: "inferred",
      category: "custom",
      superseded_by: undefined,
    };
    const mem = rowToMemory(row);
    strictEqual(mem.supersededBy, null);
  });

  it("preserves all source types correctly", () => {
    for (const source of ["explicit", "observed", "distilled", "inferred"]) {
      const row = {
        id: 1,
        claim: "t",
        confidence: 0.5,
        evidence_count: 1,
        created_at: 0,
        verified_at: 0,
        source,
        category: "fact",
        superseded_by: null,
      };
      strictEqual(rowToMemory(row).source, source);
    }
  });

  it("preserves all category types correctly", () => {
    for (const category of ["preference", "fact", "procedure", "capability", "custom"]) {
      const row = {
        id: 1,
        claim: "t",
        confidence: 0.5,
        evidence_count: 1,
        created_at: 0,
        verified_at: 0,
        source: "explicit",
        category,
        superseded_by: null,
      };
      strictEqual(rowToMemory(row).category, category);
    }
  });
});
