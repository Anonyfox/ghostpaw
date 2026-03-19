import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { renderSoul } from "./render_soul.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("renderSoul", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("returns null for nonexistent soul", () => {
    strictEqual(renderSoul(db, 999), null);
  });

  it("renders essence-only soul without Traits section", () => {
    const soul = createSoul(db, { name: "Bare", essence: "Just an essence." });
    const md = renderSoul(db, soul.id);
    ok(md);
    ok(md!.startsWith("# Bare\n\nJust an essence."));
    strictEqual(md!.includes("## Traits"), false);
  });

  it("renders essence + active traits", () => {
    const soul = createSoul(db, {
      name: "Full Soul",
      essence: "The founding narrative.",
    });
    addTrait(db, soul.id, {
      principle: "Check before coding.",
      provenance: "Three failures proved this.",
    });
    addTrait(db, soul.id, {
      principle: "Named exports.",
      provenance: "Four corrections showed this.",
    });

    const md = renderSoul(db, soul.id)!;
    ok(md.includes("# Full Soul"));
    ok(md.includes("The founding narrative."));
    ok(md.includes("## Traits"));
    ok(md.includes("**Check before coding.** Three failures proved this."));
    ok(md.includes("**Named exports.** Four corrections showed this."));
  });

  it("excludes non-active traits from rendered output", () => {
    const soul = createSoul(db, { name: "Mixed", essence: "e" });
    addTrait(db, soul.id, { principle: "Active trait.", provenance: "Evidence." });
    const reverted = addTrait(db, soul.id, {
      principle: "Reverted trait.",
      provenance: "Old evidence.",
    });
    db.prepare("UPDATE soul_traits SET status = 'reverted' WHERE id = ?").run(reverted.id);

    const md = renderSoul(db, soul.id)!;
    ok(md.includes("**Active trait.**"));
    strictEqual(md.includes("Reverted trait."), false);
  });

  it("renders description when present", () => {
    const soul = createSoul(db, {
      name: "Described",
      essence: "Core identity.",
      description: "A helpful companion.",
    });
    const md = renderSoul(db, soul.id)!;
    ok(md.includes("# Described"));
    ok(md.includes("*A helpful companion.*"));
    ok(md.includes("Core identity."));
  });

  it("omits description line when empty", () => {
    const soul = createSoul(db, { name: "NoDesc", essence: "e" });
    const md = renderSoul(db, soul.id)!;
    strictEqual(md.includes("*"), false);
  });

  it("renders correctly with empty essence", () => {
    const soul = createSoul(db, { name: "Empty", essence: "" });
    const md = renderSoul(db, soul.id)!;
    ok(md.startsWith("# Empty\n\n"));
  });
});
