import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { PackInteraction, PackMember } from "../../core/pack/types.ts";
import {
  formatInteraction,
  formatMemberDetail,
  formatMemberSummary,
  relativeTime,
  trustLabel,
} from "./format_pack.ts";

const NOW = 1_700_000_000_000;

function makeMember(overrides: Partial<PackMember> = {}): PackMember {
  return {
    id: 1,
    name: "Alice",
    kind: "human",
    bond: "A trusted partner.",
    trust: 0.75,
    status: "active",
    firstContact: NOW - 86_400_000 * 42,
    lastContact: NOW - 7_200_000,
    metadata: '{"timezone":"CET"}',
    createdAt: NOW - 86_400_000 * 42,
    updatedAt: NOW - 7_200_000,
    ...overrides,
  };
}

function makeInteraction(overrides: Partial<PackInteraction> = {}): PackInteraction {
  return {
    id: 12,
    memberId: 1,
    kind: "conversation",
    summary: "Discussed project restructuring.",
    significance: 0.7,
    sessionId: null,
    createdAt: NOW - 7_200_000,
    ...overrides,
  };
}

describe("trustLabel", () => {
  it("returns deep for >= 0.8", () => strictEqual(trustLabel(0.9), "deep"));
  it("returns solid for >= 0.6", () => strictEqual(trustLabel(0.7), "solid"));
  it("returns growing for >= 0.3", () => strictEqual(trustLabel(0.4), "growing"));
  it("returns shallow for < 0.3", () => strictEqual(trustLabel(0.1), "shallow"));
});

describe("relativeTime", () => {
  it("returns just now for < 1 minute", () => {
    strictEqual(relativeTime(NOW - 30_000, NOW), "just now");
  });
  it("returns minutes", () => {
    strictEqual(relativeTime(NOW - 300_000, NOW), "5m ago");
  });
  it("returns hours", () => {
    strictEqual(relativeTime(NOW - 7_200_000, NOW), "2h ago");
  });
  it("returns days", () => {
    strictEqual(relativeTime(NOW - 86_400_000 * 3, NOW), "3d ago");
  });
  it("returns weeks", () => {
    strictEqual(relativeTime(NOW - 86_400_000 * 14, NOW), "2w ago");
  });
  it("returns months", () => {
    strictEqual(relativeTime(NOW - 86_400_000 * 90, NOW), "3mo ago");
  });
});

describe("formatMemberSummary", () => {
  it("produces correct shape", () => {
    const s = formatMemberSummary(makeMember(), 5, NOW);
    strictEqual(s.id, 1);
    strictEqual(s.name, "Alice");
    strictEqual(s.trust_level, "solid");
    strictEqual(s.last_contact, "2h ago");
    strictEqual(s.interactions, 5);
  });

  it("truncates long bonds", () => {
    const s = formatMemberSummary(makeMember({ bond: "A".repeat(200) }), 0, NOW);
    ok(s.bond_excerpt.length <= 123);
    ok(s.bond_excerpt.endsWith("..."));
  });
});

describe("formatInteraction", () => {
  it("produces correct shape", () => {
    const f = formatInteraction(makeInteraction(), NOW);
    strictEqual(f.id, 12);
    strictEqual(f.kind, "conversation");
    strictEqual(f.significance, 0.7);
    strictEqual(f.age, "2h ago");
  });
});

describe("formatMemberDetail", () => {
  it("includes all fields and interactions", () => {
    const d = formatMemberDetail(makeMember(), [makeInteraction()], NOW);
    strictEqual(d.name, "Alice");
    strictEqual(d.trust_level, "solid");
    strictEqual(d.bond, "A trusted partner.");
    ok(d.first_contact.includes("ago"));
    strictEqual(d.recent_interactions.length, 1);
    strictEqual(d.metadata.timezone, "CET");
  });

  it("handles invalid metadata JSON gracefully", () => {
    const d = formatMemberDetail(makeMember({ metadata: "not-json" }), [], NOW);
    strictEqual(Object.keys(d.metadata).length, 0);
  });
});
