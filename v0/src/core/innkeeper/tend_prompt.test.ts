import assert from "node:assert";
import { describe, it } from "node:test";
import type { types } from "@ghostpaw/affinity";
import type { CandidateContext } from "./tend_prompt.ts";
import { buildTendPrompt } from "./tend_prompt.ts";

const baseContext: CandidateContext = {
  names: new Map<number, string>([
    [2, "Sarah Chen"],
    [8, "Sarah"],
    [5, "Marcus"],
    [14, "Mike Johnson"],
    [19, "Mike J."],
  ]),
  profiles: new Map(),
  linksBetween: new Map(),
};

describe("buildTendPrompt", () => {
  it("includes duplicate candidates with names and scores", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.85 },
    ];
    const prompt = buildTendPrompt(candidates, [], baseContext);

    assert.ok(prompt.includes('"Sarah Chen" (#2)'));
    assert.ok(prompt.includes('"Sarah" (#8)'));
    assert.ok(prompt.includes("name similarity"));
    assert.ok(prompt.includes("0.85"));
    assert.ok(prompt.includes("Duplicate candidates: 1"));
  });

  it("includes radar drift items with names and priority", () => {
    const driftItems: types.RadarRecord[] = [
      {
        linkId: 10,
        contactId: 5,
        driftPriority: 0.8,
        recencyScore: 0.1,
        normalizedRank: 0.6,
        trust: 0.7,
        recommendedReason: "Significantly overdue for contact",
      },
    ];
    const prompt = buildTendPrompt([], driftItems, baseContext);

    assert.ok(prompt.includes('"Marcus" (#5)'));
    assert.ok(prompt.includes("0.80"));
    assert.ok(prompt.includes("Significantly overdue for contact"));
    assert.ok(prompt.includes("Drift items: 1"));
  });

  it("handles both duplicates and drift together", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 14, rightContactId: 19, matchReason: "name similarity", matchScore: 0.72 },
    ];
    const driftItems: types.RadarRecord[] = [
      {
        linkId: 10,
        contactId: 5,
        driftPriority: 0.6,
        recencyScore: 0.2,
        normalizedRank: 0.5,
        trust: 0.5,
        recommendedReason: "Significantly overdue for contact",
      },
    ];
    const prompt = buildTendPrompt(candidates, driftItems, baseContext);

    assert.ok(prompt.includes("Duplicate candidates: 1"));
    assert.ok(prompt.includes("Drift items: 1"));
    assert.ok(prompt.includes("DUPLICATES"));
    assert.ok(prompt.includes("RELATIONSHIP DRIFT"));
  });

  it("includes decision guide when duplicates are present", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.85 },
    ];
    const prompt = buildTendPrompt(candidates, [], baseContext);

    assert.ok(prompt.includes("Decision guide (apply in order):"));
    assert.ok(prompt.includes("short name or nickname"));
    assert.ok(prompt.includes("role suffix"));
    assert.ok(prompt.includes("stub from an early mention"));
    assert.ok(prompt.includes("DO NOT MERGE when both contacts have different"));
  });

  it("uses action-oriented closing instead of cautionary language", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.85 },
    ];
    const prompt = buildTendPrompt(candidates, [], baseContext);

    assert.ok(prompt.includes("Act on every pair"));
    assert.ok(!prompt.includes("Not all name matches are duplicates"));
  });

  it("omits decision guide when no duplicates", () => {
    const prompt = buildTendPrompt([], [], baseContext);
    assert.ok(!prompt.includes("Decision guide:"));
  });

  it("omits duplicate section when no candidates", () => {
    const prompt = buildTendPrompt([], [], baseContext);

    assert.ok(!prompt.includes("DUPLICATES"));
    assert.ok(!prompt.includes("RELATIONSHIP DRIFT"));
    assert.ok(prompt.includes("Duplicate candidates: 0"));
  });

  it("falls back to ID when name is missing from map", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 999, rightContactId: 888, matchReason: "identity overlap", matchScore: 1.0 },
    ];
    const emptyCtx: CandidateContext = { names: new Map(), profiles: new Map(), linksBetween: new Map() };
    const prompt = buildTendPrompt(candidates, [], emptyCtx);

    assert.ok(prompt.includes('"#999" (#999)'));
    assert.ok(prompt.includes('"#888" (#888)'));
  });

  it("appends link evidence when links exist between candidates", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.92 },
    ];
    const ctx: CandidateContext = {
      names: baseContext.names,
      profiles: new Map(),
      linksBetween: new Map([
        ["2:8", [{ kind: "other_relational", role: "same_person_alias" }]],
      ]),
    };
    const prompt = buildTendPrompt(candidates, [], ctx);

    assert.ok(prompt.includes("[links: other_relational/same_person_alias]"));
  });

  it("omits link suffix when no links exist between candidates", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 14, rightContactId: 19, matchReason: "name similarity", matchScore: 0.72 },
    ];
    const prompt = buildTendPrompt(candidates, [], baseContext);

    assert.ok(!prompt.includes("[links:"));
  });

  it("includes inline profile data when profiles are provided", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.85 },
    ];
    const ctx: CandidateContext = {
      names: baseContext.names,
      profiles: new Map([
        [2, { identities: ["alias:SC", "email:sc@co.com"], attributes: ["dept=engineering"], linkCount: 3 }],
        [8, { identities: [], attributes: [], linkCount: 0 }],
      ]),
      linksBetween: new Map(),
    };
    const prompt = buildTendPrompt(candidates, [], ctx);

    assert.ok(prompt.includes("alias:SC, email:sc@co.com"), "should show identities");
    assert.ok(prompt.includes("dept=engineering"), "should show attributes");
    assert.ok(prompt.includes("3 links"), "should show link count for left");
    assert.ok(prompt.includes("0 links"), "should show link count for right");
  });

  it("handles links with null role", () => {
    const candidates: types.DuplicateCandidateRecord[] = [
      { leftContactId: 2, rightContactId: 8, matchReason: "name similarity", matchScore: 0.90 },
    ];
    const ctx: CandidateContext = {
      names: baseContext.names,
      profiles: new Map(),
      linksBetween: new Map([["2:8", [{ kind: "professional", role: null }]]]),
    };
    const prompt = buildTendPrompt(candidates, [], ctx);

    assert.ok(prompt.includes("[links: professional]"));
    assert.ok(!prompt.includes("professional/null"));
  });
});
