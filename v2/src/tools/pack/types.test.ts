import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  FormattedContact,
  FormattedInteraction,
  FormattedMemberDetail,
  FormattedMemberSummary,
} from "./types.ts";

describe("pack tool types", () => {
  it("FormattedMemberSummary is structurally valid", () => {
    const s: FormattedMemberSummary = {
      id: 1,
      name: "Alice",
      kind: "human",
      trust: 0.75,
      trust_level: "solid",
      status: "active",
      bond_excerpt: "A trusted ally.",
      last_contact: "2h ago",
      interactions: 5,
    };
    ok(s.id > 0);
    strictEqual(s.kind, "human");
  });

  it("FormattedMemberDetail includes contacts and interactions", () => {
    const d: FormattedMemberDetail = {
      id: 1,
      name: "Alice",
      kind: "human",
      trust: 0.85,
      trust_level: "deep",
      status: "active",
      is_user: true,
      bond: "Full bond narrative here.",
      first_contact: "42d ago",
      last_contact: "2h ago",
      contacts: [{ type: "email", value: "alice@test.com", label: "work" }],
      recent_interactions: [],
    };
    ok(Array.isArray(d.recent_interactions));
    ok(Array.isArray(d.contacts));
    strictEqual(d.is_user, true);
  });

  it("FormattedContact is structurally valid", () => {
    const c: FormattedContact = {
      type: "telegram",
      value: "12345",
      label: null,
    };
    strictEqual(c.type, "telegram");
    strictEqual(c.label, null);
  });

  it("FormattedInteraction is structurally valid", () => {
    const i: FormattedInteraction = {
      id: 12,
      kind: "conversation",
      summary: "Discussed project goals.",
      significance: 0.7,
      age: "2h ago",
    };
    ok(i.significance >= 0 && i.significance <= 1);
  });
});
