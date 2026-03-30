import assert from "node:assert";
import { describe, it } from "node:test";
import {
  GHOSTPAW_BLUEPRINT,
  INNKEEPER_BLUEPRINT,
  INTERNAL_SOUL_BLUEPRINTS,
  MENTOR_BLUEPRINT,
  SCRIBE_BLUEPRINT,
} from "./default_souls.ts";

describe("internal soul blueprints", () => {
  it("exports exactly 4 internal blueprints in deterministic order", () => {
    assert.strictEqual(INTERNAL_SOUL_BLUEPRINTS.length, 4);
    const slugs = INTERNAL_SOUL_BLUEPRINTS.map((b) => b.slug);
    assert.deepStrictEqual(slugs, ["ghostpaw", "scribe", "innkeeper", "mentor"]);
  });

  it("all internal blueprints have non-empty slugs", () => {
    for (const blueprint of INTERNAL_SOUL_BLUEPRINTS) {
      assert.ok(blueprint.slug.length > 0, `${blueprint.name} slug must be non-empty`);
    }
  });

  it("all internal blueprints have non-empty essences", () => {
    for (const blueprint of INTERNAL_SOUL_BLUEPRINTS) {
      assert.ok(blueprint.essence.length > 100, `${blueprint.name} essence is too short`);
    }
  });
});

describe("GHOSTPAW_BLUEPRINT", () => {
  it("has the correct slug and no traits", () => {
    assert.strictEqual(GHOSTPAW_BLUEPRINT.slug, "ghostpaw");
    assert.deepStrictEqual(GHOSTPAW_BLUEPRINT.traits, []);
  });

  it("essence references core ghostpaw identity", () => {
    assert.ok(GHOSTPAW_BLUEPRINT.essence.includes("Ghostpaw"));
    assert.ok(GHOSTPAW_BLUEPRINT.essence.includes("tools"));
  });
});

describe("SCRIBE_BLUEPRINT", () => {
  it("has the correct slug", () => {
    assert.strictEqual(SCRIBE_BLUEPRINT.slug, "scribe");
  });

  it("essence includes codex soul content and scribe role text", () => {
    assert.ok(SCRIBE_BLUEPRINT.essence.length > 200);
    assert.ok(SCRIBE_BLUEPRINT.essence.includes("Scribe"));
    assert.ok(SCRIBE_BLUEPRINT.essence.includes("[scribe]"));
  });

  it("has baseline traits from codex package", () => {
    assert.ok(SCRIBE_BLUEPRINT.traits.length > 0, "scribe should have baseline traits");
    for (const trait of SCRIBE_BLUEPRINT.traits) {
      assert.ok(trait.principle.length > 0, "each trait must have a principle");
      assert.ok(trait.provenance.length > 0, "each trait must have provenance");
    }
  });
});

describe("INNKEEPER_BLUEPRINT", () => {
  it("has the correct slug", () => {
    assert.strictEqual(INNKEEPER_BLUEPRINT.slug, "innkeeper");
  });

  it("essence includes affinity soul content and innkeeper role text", () => {
    assert.ok(INNKEEPER_BLUEPRINT.essence.length > 200);
    assert.ok(INNKEEPER_BLUEPRINT.essence.includes("Innkeeper"));
    assert.ok(INNKEEPER_BLUEPRINT.essence.includes("[innkeeper]"));
  });

  it("has baseline traits from affinity package", () => {
    assert.ok(INNKEEPER_BLUEPRINT.traits.length > 0, "innkeeper should have baseline traits");
  });
});

describe("MENTOR_BLUEPRINT", () => {
  it("has the correct slug", () => {
    assert.strictEqual(MENTOR_BLUEPRINT.slug, "mentor");
  });

  it("essence contains mentor soul content", () => {
    assert.ok(MENTOR_BLUEPRINT.essence.length > 100);
  });

  it("has baseline traits from souls package", () => {
    assert.ok(MENTOR_BLUEPRINT.traits.length > 0, "mentor should have baseline traits");
  });
});
