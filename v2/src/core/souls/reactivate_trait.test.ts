import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { reactivateTrait } from "./reactivate_trait.ts";
import { revertTrait } from "./revert_trait.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("reactivateTrait", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Soul", essence: "" });
    soulId = soul.id;
  });

  it("reactivates a reverted trait", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    revertTrait(db, t.id);
    const reactivated = reactivateTrait(db, t.id);
    strictEqual(reactivated.status, "active");
  });

  it("reactivates a consolidated trait and clears merged_into", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    const t2 = addTrait(db, soulId, { principle: "merged", provenance: "merged evidence" });
    db.prepare("UPDATE soul_traits SET status = 'consolidated', merged_into = ? WHERE id = ?").run(
      t2.id,
      t.id,
    );

    const reactivated = reactivateTrait(db, t.id);
    strictEqual(reactivated.status, "active");
    strictEqual(reactivated.mergedInto, null);
  });

  it("reactivates a promoted trait", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    db.prepare("UPDATE soul_traits SET status = 'promoted' WHERE id = ?").run(t.id);

    const reactivated = reactivateTrait(db, t.id);
    strictEqual(reactivated.status, "active");
  });

  it("throws when trait is already active", () => {
    const t = addTrait(db, soulId, { principle: "p", provenance: "e" });
    throws(() => reactivateTrait(db, t.id), /already active/i);
  });

  it("throws when trait not found", () => {
    throws(() => reactivateTrait(db, 99999), /not found/i);
  });

  it("throws when soul is archived", () => {
    const custom = createSoul(db, { name: "A", essence: "" });
    const t = addTrait(db, custom.id, { principle: "p", provenance: "e" });
    revertTrait(db, t.id);
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(() => reactivateTrait(db, t.id), /archived/i);
  });
});
