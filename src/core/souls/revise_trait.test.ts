import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { reviseTrait } from "./revise_trait.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("reviseTrait", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Soul", essence: "" });
    soulId = soul.id;
  });

  it("revises principle only", () => {
    const t = addTrait(db, soulId, { principle: "old", provenance: "evidence" });
    const revised = reviseTrait(db, t.id, { principle: "new" });
    strictEqual(revised.principle, "new");
    strictEqual(revised.provenance, "evidence");
  });

  it("revises provenance only", () => {
    const t = addTrait(db, soulId, { principle: "principle", provenance: "old" });
    const revised = reviseTrait(db, t.id, { provenance: "new evidence" });
    strictEqual(revised.principle, "principle");
    strictEqual(revised.provenance, "new evidence");
  });

  it("revises both fields", () => {
    const t = addTrait(db, soulId, { principle: "old-p", provenance: "old-e" });
    const revised = reviseTrait(db, t.id, { principle: "new-p", provenance: "new-e" });
    strictEqual(revised.principle, "new-p");
    strictEqual(revised.provenance, "new-e");
  });

  it("throws when no fields provided", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    throws(() => reviseTrait(db, t.id, {}), /at least one/i);
  });

  it("throws when trait not found", () => {
    throws(() => reviseTrait(db, 99999, { principle: "x" }), /not found/i);
  });

  it("throws when trait is not active", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    db.prepare("UPDATE soul_traits SET status = 'reverted' WHERE id = ?").run(t.id);
    throws(() => reviseTrait(db, t.id, { principle: "x" }), /reverted.*cannot be revised/i);
  });

  it("throws when soul is dormant", () => {
    const custom = createSoul(db, { name: "Dormant", essence: "" });
    const t = addTrait(db, custom.id, { principle: "p", provenance: "e" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(() => reviseTrait(db, t.id, { principle: "x" }), /dormant/i);
  });

  it("throws on empty principle", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    throws(() => reviseTrait(db, t.id, { principle: "  " }), /principle.*empty/i);
  });

  it("throws on empty provenance", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    throws(() => reviseTrait(db, t.id, { provenance: "  " }), /provenance.*empty/i);
  });

  it("treats null principle and null provenance as no fields provided", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    throws(
      () =>
        reviseTrait(db, t.id, {
          principle: null as unknown as string,
          provenance: null as unknown as string,
        }),
      /at least one/i,
    );
  });

  it("treats null principle as not provided when provenance is given", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    const revised = reviseTrait(db, t.id, {
      principle: null as unknown as string,
      provenance: "new",
    });
    strictEqual(revised.principle, "p");
    strictEqual(revised.provenance, "new");
  });
});
