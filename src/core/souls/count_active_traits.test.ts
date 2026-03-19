import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { countActiveTraits } from "./count_active_traits.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;
let soulId: number;

describe("countActiveTraits", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
    const soul = createSoul(db, { name: "Soul", essence: "" });
    soulId = soul.id;
  });

  it("returns zero when no traits exist", () => {
    strictEqual(countActiveTraits(db, soulId), 0);
  });

  it("counts active traits correctly", () => {
    addTrait(db, soulId, { principle: "p1", provenance: "e1" });
    addTrait(db, soulId, { principle: "p2", provenance: "e2" });
    strictEqual(countActiveTraits(db, soulId), 2);
  });

  it("ignores non-active traits", () => {
    const t = addTrait(db, soulId, { principle: "p1", provenance: "e1" });
    addTrait(db, soulId, { principle: "p2", provenance: "e2" });
    db.prepare("UPDATE soul_traits SET status = 'reverted' WHERE id = ?").run(t.id);
    strictEqual(countActiveTraits(db, soulId), 1);
  });

  it("returns zero for nonexistent soul without error", () => {
    strictEqual(countActiveTraits(db, 999), 0);
  });
});
