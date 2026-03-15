import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { formatSoulEvidence } from "./format_evidence.ts";
import type { SoulEvidence } from "./soul_evidence_types.ts";

function makeEvidence(overrides?: Partial<SoulEvidence>): SoulEvidence {
  return {
    soulId: 1,
    soulName: "TestSoul",
    level: 2,
    essence: "A test soul.",
    description: "Test description",
    activeTraitCount: 1,
    traitLimit: 10,
    atCapacity: false,
    delegationStats: {
      total: 5,
      completed: 4,
      failed: 1,
      avgCostUsd: 0.01,
      totalCostUsd: 0.05,
      totalTokensIn: 500,
      totalTokensOut: 250,
    },
    windowedStats: [],
    traitFitness: [],
    costTrend: { recent7d: 0, previous7d: 0, direction: "stable" },
    activeTraits: [
      {
        id: 1,
        principle: "Be thorough",
        provenance: "Evidence from sessions",
        generation: 0,
        status: "active",
        createdAt: Date.now(),
      },
    ],
    revertedTraits: [],
    consolidatedTraits: [],
    promotedTraits: [],
    levelHistory: [],
    relatedMemoryCount: 3,
    pendingShards: [],
    trailSignals: [],
    ...overrides,
  };
}

describe("formatSoulEvidence", () => {
  it("produces a markdown report with soul name and key sections", () => {
    const output = formatSoulEvidence(makeEvidence());
    ok(output.includes("# Evidence Report: TestSoul"));
    ok(output.includes("## Essence"));
    ok(output.includes("## Delegation Performance"));
    ok(output.includes("## Active Traits"));
    ok(output.includes("Be thorough"));
  });

  it("shows AT CAPACITY when at trait limit", () => {
    const output = formatSoulEvidence(makeEvidence({ atCapacity: true }));
    ok(output.includes("AT CAPACITY"));
  });

  it("handles empty delegation stats gracefully", () => {
    const output = formatSoulEvidence(
      makeEvidence({
        delegationStats: {
          total: 0,
          completed: 0,
          failed: 0,
          avgCostUsd: 0,
          totalCostUsd: 0,
          totalTokensIn: 0,
          totalTokensOut: 0,
        },
      }),
    );
    ok(output.includes("No delegation runs recorded yet."));
  });

  it("includes pending shards section when shards exist", () => {
    const output = formatSoulEvidence(
      makeEvidence({
        pendingShards: [
          {
            id: 42,
            source: "session",
            sourceId: "s-1",
            observation: "reads before editing",
            sealed: false,
            status: "pending",
            createdAt: Math.floor(Date.now() / 1000),
            soulIds: [1],
          },
        ],
      }),
    );
    ok(output.includes("Pending Soulshards (1)"));
    ok(output.includes("reads before editing"));
    ok(output.includes("[shard=42]"));
  });

  it("includes trail signals section when present", () => {
    const output = formatSoulEvidence(
      makeEvidence({
        trailSignals: [
          {
            kind: "trailmark",
            description: "[milestone] First delegation",
            significance: 0.9,
            createdAt: Date.now(),
          },
        ],
      }),
    );
    ok(output.includes("## Trail Signals"));
    ok(output.includes("[milestone] First delegation"));
  });

  it("returns a string of reasonable length", () => {
    const output = formatSoulEvidence(makeEvidence());
    ok(typeof output === "string");
    ok(output.length > 100);
    strictEqual(output.split("\n").length > 10, true);
  });
});
