import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { revertTrait } from "./revert_trait.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("revertTrait", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Soul", essence: "" });
    soulId = soul.id;
  });

  it("changes an active trait to reverted", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    const reverted = revertTrait(db, t.id);
    strictEqual(reverted.status, "reverted");
    strictEqual(reverted.id, t.id);
  });

  it("throws when trait not found", () => {
    throws(() => revertTrait(db, 99999), /not found/i);
  });

  it("throws when trait is already reverted", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    revertTrait(db, t.id);
    throws(() => revertTrait(db, t.id), /reverted.*not active/i);
  });

  it("throws when trait is consolidated", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    db.prepare("UPDATE soul_traits SET status = 'consolidated' WHERE id = ?").run(t.id);
    throws(() => revertTrait(db, t.id), /consolidated.*not active/i);
  });

  it("throws when soul is dormant", () => {
    const custom = createSoul(db, { name: "A", essence: "" });
    const t = addTrait(db, custom.id, { principle: "p", provenance: "e" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(() => revertTrait(db, t.id), /dormant/i);
  });
});
