import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { FormattedMemory } from "./types.ts";

describe("FormattedMemory", () => {
  it("accepts all required fields", () => {
    const mem: FormattedMemory = {
      id: 1,
      claim: "User prefers dark mode",
      strength: "strong",
      confidence: 0.85,
      evidence: 3,
      source: "explicit",
      category: "preference",
      last_verified: "2d ago",
    };
    strictEqual(mem.id, 1);
    strictEqual(mem.strength, "strong");
    strictEqual(mem.similarity, undefined);
  });

  it("accepts optional similarity field for ranked results", () => {
    const mem: FormattedMemory = {
      id: 2,
      claim: "User likes pizza",
      strength: "fading",
      confidence: 0.5,
      evidence: 1,
      source: "observed",
      category: "fact",
      last_verified: "1w ago",
      similarity: 0.82,
    };
    ok(mem.similarity !== undefined);
    strictEqual(mem.similarity, 0.82);
  });

  it("strength is a narrow union, not arbitrary string", () => {
    const strengths: FormattedMemory["strength"][] = ["strong", "fading", "faint"];
    strictEqual(strengths.length, 3);
  });
});
