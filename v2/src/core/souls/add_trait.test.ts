import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("addTrait", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, {
      name: "Engineer",
      essence: "Builds things.",
    });
    soulId = soul.id;
  });

  it("adds an active trait to a soul", () => {
    const trait = addTrait(db, soulId, {
      principle: "Verify API shapes before coding.",
      provenance: "Three delegation runs failed silently.",
    });
    strictEqual(trait.soulId, soulId);
    strictEqual(trait.principle, "Verify API shapes before coding.");
    strictEqual(trait.provenance, "Three delegation runs failed silently.");
    strictEqual(trait.status, "active");
    strictEqual(trait.generation, 0);
    strictEqual(trait.mergedInto, null);
    ok(trait.id > 0);
  });

  it("sets generation to the soul's current level", () => {
    db.prepare("UPDATE souls SET level = 3 WHERE id = ?").run(soulId);
    const trait = addTrait(db, soulId, { principle: "p", provenance: "e" });
    strictEqual(trait.generation, 3);
  });

  it("trims principle and provenance", () => {
    const trait = addTrait(db, soulId, { principle: "  trimmed  ", provenance: "  evidence  " });
    strictEqual(trait.principle, "trimmed");
    strictEqual(trait.provenance, "evidence");
  });

  it("throws on empty principle", () => {
    throws(
      () => addTrait(db, soulId, { principle: "   ", provenance: "evidence" }),
      /principle.*empty/i,
    );
  });

  it("throws on empty provenance — the provenance gate", () => {
    throws(
      () => addTrait(db, soulId, { principle: "good principle", provenance: "  " }),
      /provenance.*empty/i,
    );
  });

  it("throws when soul does not exist", () => {
    throws(() => addTrait(db, 999, { principle: "p", provenance: "e" }), /not found/i);
  });

  it("throws when soul is archived", () => {
    const custom = createSoul(db, { name: "Archived", essence: "" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(() => addTrait(db, custom.id, { principle: "p", provenance: "e" }), /archived/i);
  });

  it("throws on null principle", () => {
    throws(
      () => addTrait(db, soulId, { principle: null as unknown as string, provenance: "e" }),
      /principle.*string/i,
    );
  });

  it("throws on null provenance", () => {
    throws(
      () => addTrait(db, soulId, { principle: "p", provenance: null as unknown as string }),
      /provenance.*string/i,
    );
  });
});
