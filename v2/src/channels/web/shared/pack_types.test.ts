import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PackContactInfo,
  PackInteractionInfo,
  PackListResponse,
  PackMemberDetailResponse,
  PackMemberInfo,
  PackStatsResponse,
} from "./pack_types.ts";
import { bondExcerpt, trustLevel } from "./pack_types.ts";

describe("pack shared types", () => {
  it("PackMemberInfo is structurally valid", () => {
    const info: PackMemberInfo = {
      id: 1,
      name: "Alice",
      kind: "human",
      trust: 0.75,
      trustLevel: "solid",
      status: "active",
      bondExcerpt: "Trusted ally",
      lastContact: Date.now(),
      interactionCount: 5,
    };
    ok(info.id > 0);
    strictEqual(info.kind, "human");
  });

  it("PackInteractionInfo is structurally valid", () => {
    const info: PackInteractionInfo = {
      id: 1,
      kind: "conversation",
      summary: "Discussed project goals",
      significance: 0.6,
      createdAt: Date.now(),
    };
    ok(info.significance >= 0 && info.significance <= 1);
  });

  it("PackContactInfo is structurally valid", () => {
    const info: PackContactInfo = {
      id: 1,
      type: "email",
      value: "alice@example.com",
      label: "work",
    };
    strictEqual(info.type, "email");
    strictEqual(info.label, "work");
  });

  it("PackMemberDetailResponse includes contacts and interactions", () => {
    const detail: PackMemberDetailResponse = {
      id: 1,
      name: "Alice",
      kind: "human",
      bond: "A trusted friend and collaborator.",
      trust: 0.85,
      trustLevel: "deep",
      status: "active",
      isUser: true,
      firstContact: Date.now() - 86400000,
      lastContact: Date.now(),
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      contacts: [{ id: 1, type: "email", value: "alice@test.com", label: null }],
      interactions: [],
    };
    ok(Array.isArray(detail.interactions));
    ok(Array.isArray(detail.contacts));
    strictEqual(detail.isUser, true);
    strictEqual(detail.contacts.length, 1);
  });

  it("PackListResponse wraps members with counts", () => {
    const list: PackListResponse = {
      members: [],
      counts: { active: 0, dormant: 0, lost: 0, total: 0 },
    };
    strictEqual(list.counts.total, 0);
  });

  it("PackStatsResponse is structurally valid", () => {
    const stats: PackStatsResponse = { active: 3, dormant: 1, lost: 0, total: 4 };
    ok(stats.active + stats.dormant + stats.lost === stats.total);
  });

  it("trustLevel returns correct levels", () => {
    strictEqual(trustLevel(0.9), "deep");
    strictEqual(trustLevel(0.8), "deep");
    strictEqual(trustLevel(0.7), "solid");
    strictEqual(trustLevel(0.6), "solid");
    strictEqual(trustLevel(0.4), "growing");
    strictEqual(trustLevel(0.3), "growing");
    strictEqual(trustLevel(0.2), "shallow");
    strictEqual(trustLevel(0.0), "shallow");
  });

  it("bondExcerpt truncates long bonds", () => {
    const short = "Short bond.";
    strictEqual(bondExcerpt(short), short);

    const long = "A".repeat(200);
    const result = bondExcerpt(long);
    ok(result.length <= 123);
    ok(result.endsWith("..."));
  });
});
