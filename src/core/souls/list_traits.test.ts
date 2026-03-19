import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { listTraits } from "./list_traits.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("listTraits", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Soul", essence: "" });
    soulId = soul.id;
  });

  it("returns all traits for a soul", () => {
    addTrait(db, soulId, { principle: "p1", provenance: "e1" });
    addTrait(db, soulId, { principle: "p2", provenance: "e2" });
    strictEqual(listTraits(db, soulId).length, 2);
  });

  it("returns empty array when soul has no traits", () => {
    strictEqual(listTraits(db, soulId).length, 0);
  });

  it("filters by status", () => {
    addTrait(db, soulId, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, soulId, { principle: "p2", provenance: "e2" });
    db.prepare("UPDATE soul_traits SET status = 'reverted' WHERE id = ?").run(t2.id);

    strictEqual(listTraits(db, soulId, { status: "active" }).length, 1);
    strictEqual(listTraits(db, soulId, { status: "reverted" }).length, 1);
  });

  it("filters by generation", () => {
    addTrait(db, soulId, { principle: "gen0", provenance: "e" });
    db.prepare("UPDATE souls SET level = 1 WHERE id = ?").run(soulId);
    addTrait(db, soulId, { principle: "gen1", provenance: "e" });

    strictEqual(listTraits(db, soulId, { generation: 0 }).length, 1);
    strictEqual(listTraits(db, soulId, { generation: 1 }).length, 1);
  });

  it("returns traits ordered by created_at", () => {
    addTrait(db, soulId, { principle: "first", provenance: "e" });
    addTrait(db, soulId, { principle: "second", provenance: "e" });
    const traits = listTraits(db, soulId);
    strictEqual(traits[0].principle, "first");
    strictEqual(traits[1].principle, "second");
  });
});
