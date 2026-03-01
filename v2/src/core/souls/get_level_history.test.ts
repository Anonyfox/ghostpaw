import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { getLevelHistory } from "./get_level_history.ts";
import { levelUp } from "./level_up.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getLevelHistory", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("returns empty array when no level-ups exist", () => {
    const soul = createSoul(db, { name: "Soul", essence: "" });
    strictEqual(getLevelHistory(db, soul.id).length, 0);
  });

  it("returns level records ordered by level ascending", () => {
    const soul = createSoul(db, { name: "Soul", essence: "e0" });
    const t1 = addTrait(db, soul.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, soul.id, { principle: "p2", provenance: "e2" });

    levelUp(db, soul.id, {
      newEssence: "e1",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });

    const t3 = addTrait(db, soul.id, { principle: "p3", provenance: "e3" });
    levelUp(db, soul.id, {
      newEssence: "e2",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id, t3.id],
    });

    const history = getLevelHistory(db, soul.id);
    strictEqual(history.length, 2);
    strictEqual(history[0].level, 1);
    strictEqual(history[1].level, 2);
    strictEqual(history[0].essenceBefore, "e0");
    strictEqual(history[0].essenceAfter, "e1");
    strictEqual(history[1].essenceBefore, "e1");
    strictEqual(history[1].essenceAfter, "e2");
  });

  it("returns empty for nonexistent soul", () => {
    strictEqual(getLevelHistory(db, 999).length, 0);
  });
});
