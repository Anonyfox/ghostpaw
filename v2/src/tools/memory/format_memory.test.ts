import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { Memory, RankedMemory } from "../../core/memory/index.ts";
import { formatMemoryForAgent } from "./format_memory.ts";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 1,
    claim: "test claim",
    confidence: 0.8,
    evidenceCount: 2,
    createdAt: 1700000000000,
    verifiedAt: 1700000000000,
    source: "explicit",
    category: "fact",
    supersededBy: null,
    ...overrides,
  };
}

describe("formatMemoryForAgent", () => {
  it("formats a basic memory with all fields", () => {
    const now = 1700000000000 + MS_PER_DAY * 3;
    const result = formatMemoryForAgent(makeMemory(), now);
    strictEqual(result.id, 1);
    strictEqual(result.claim, "test claim");
    strictEqual(result.strength, "strong");
    strictEqual(result.confidence, 0.8);
    strictEqual(result.evidence, 2);
    strictEqual(result.source, "explicit");
    strictEqual(result.category, "fact");
    strictEqual(result.last_verified, "3d ago");
    strictEqual(result.similarity, undefined);
  });

  it("labels confidence >= 0.7 as strong", () => {
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.7 })).strength, "strong");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.99 })).strength, "strong");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 1.0 })).strength, "strong");
  });

  it("labels confidence >= 0.4 and < 0.7 as fading", () => {
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.4 })).strength, "fading");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.5 })).strength, "fading");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.69 })).strength, "fading");
  });

  it("labels confidence < 0.4 as faint", () => {
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.39 })).strength, "faint");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.1 })).strength, "faint");
    strictEqual(formatMemoryForAgent(makeMemory({ confidence: 0.0 })).strength, "faint");
  });

  it("formats relative time — just now", () => {
    const now = 1700000000000;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: now }), now).last_verified,
      "just now",
    );
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: now + 5000 }), now).last_verified,
      "just now",
    );
  });

  it("formats relative time — minutes", () => {
    const now = 1700000000000 + MS_PER_MINUTE * 15;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: 1700000000000 }), now).last_verified,
      "15m ago",
    );
  });

  it("formats relative time — hours", () => {
    const now = 1700000000000 + MS_PER_HOUR * 5;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: 1700000000000 }), now).last_verified,
      "5h ago",
    );
  });

  it("formats relative time — days", () => {
    const now = 1700000000000 + MS_PER_DAY * 6;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: 1700000000000 }), now).last_verified,
      "6d ago",
    );
  });

  it("formats relative time — weeks", () => {
    const now = 1700000000000 + MS_PER_DAY * 21;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: 1700000000000 }), now).last_verified,
      "3w ago",
    );
  });

  it("formats relative time — months", () => {
    const now = 1700000000000 + MS_PER_DAY * 90;
    strictEqual(
      formatMemoryForAgent(makeMemory({ verifiedAt: 1700000000000 }), now).last_verified,
      "3mo ago",
    );
  });

  it("includes similarity for RankedMemory", () => {
    const ranked: RankedMemory = {
      ...makeMemory(),
      score: 0.65,
      similarity: 0.789,
    };
    const result = formatMemoryForAgent(ranked);
    strictEqual(result.similarity, 0.79);
  });

  it("rounds confidence to two decimal places", () => {
    const result = formatMemoryForAgent(makeMemory({ confidence: 0.8567 }));
    strictEqual(result.confidence, 0.86);
  });

  it("handles zero evidence count", () => {
    const result = formatMemoryForAgent(makeMemory({ evidenceCount: 0 }));
    strictEqual(result.evidence, 0);
  });
});
