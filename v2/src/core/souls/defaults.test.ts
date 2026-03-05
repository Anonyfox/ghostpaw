import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { DEFAULT_SOULS } from "./defaults.ts";
import { MANDATORY_SOUL_NAMES } from "./mandatory_souls.ts";

describe("DEFAULT_SOULS", () => {
  it("has an entry for every mandatory soul name", () => {
    for (const name of MANDATORY_SOUL_NAMES) {
      ok(DEFAULT_SOULS[name], `Missing default for mandatory soul: ${name}`);
    }
  });

  it("every entry has a non-empty name", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      ok(soul.name.trim().length > 0, `Default soul ${key} has empty name`);
    }
  });

  it("every entry has a slug matching its key", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      strictEqual(soul.slug, key, `Default soul ${key} slug mismatch`);
    }
  });

  it("every entry has a non-empty description", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      ok(soul.description.trim().length > 0, `Default soul ${key} has empty description`);
    }
  });

  it("every entry has a substantial essence (>100 chars)", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      ok(
        soul.essence.length > 100,
        `Default soul ${key} essence is only ${soul.essence.length} chars — too short for a production soul`,
      );
    }
  });

  it("has exactly five entries", () => {
    strictEqual(Object.keys(DEFAULT_SOULS).length, 5);
  });

  it("ghostpaw default addresses the coordinator role", () => {
    ok(DEFAULT_SOULS.ghostpaw.essence.includes("coordinator"));
  });

  it("js-engineer default addresses engineering", () => {
    ok(DEFAULT_SOULS["js-engineer"].essence.includes("engineer"));
  });

  it("prompt-engineer default addresses prompt craft", () => {
    ok(DEFAULT_SOULS["prompt-engineer"].essence.includes("cognitive"));
  });

  it("mentor default addresses refinement", () => {
    ok(DEFAULT_SOULS.mentor.essence.includes("refinement"));
  });

  it("every entry has at least one default trait", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      ok(soul.traits.length > 0, `Default soul ${key} has no baseline traits`);
    }
  });

  it("every default trait has non-empty principle and provenance", () => {
    for (const [key, soul] of Object.entries(DEFAULT_SOULS)) {
      for (const trait of soul.traits) {
        ok(
          trait.principle.trim().length > 0,
          `Default soul ${key} has a trait with empty principle`,
        );
        ok(
          trait.provenance.trim().length > 0,
          `Default soul ${key} has a trait with empty provenance`,
        );
      }
    }
  });
});
