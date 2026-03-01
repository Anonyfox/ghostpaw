import { deepStrictEqual, ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { getSoul } from "./get_soul.ts";
import { getTrait } from "./get_trait.ts";
import { levelUp } from "./level_up.ts";
import { listTraits } from "./list_traits.ts";
import { initSoulsTables } from "./schema.ts";
import type { LevelUpPlan } from "./types.ts";

let db: DatabaseHandle;
let engId: number;

function setupSoulWithTraits() {
  const eng = createSoul(db, {
    name: "Engineer",
    essence: "Original essence.",
  });
  engId = eng.id;
  const t1 = addTrait(db, engId, { principle: "Verify APIs", provenance: "Three failures" });
  const t2 = addTrait(db, engId, { principle: "Named exports", provenance: "Four corrections" });
  const t3 = addTrait(db, engId, { principle: "Read before write", provenance: "Five incidents" });
  const t4 = addTrait(db, engId, {
    principle: "Check file integrity",
    provenance: "Two corruptions",
  });
  const t5 = addTrait(db, engId, {
    principle: "Trust tool results",
    provenance: "Consistent pattern",
  });
  return { t1, t2, t3, t4, t5 };
}

describe("levelUp", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("executes a full level-up: consolidate + promote + carry", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    const plan: LevelUpPlan = {
      newEssence: "Enriched essence after level-up.",
      consolidations: [
        {
          sourceTraitIds: [t1.id, t2.id],
          mergedPrinciple: "Verify everything before coding",
          mergedProvenance: "Seven incidents combined",
        },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    };

    const lvl = levelUp(db, engId, plan);
    strictEqual(lvl.level, 1);
    strictEqual(lvl.soulId, engId);
    strictEqual(lvl.essenceBefore, "Original essence.");
    strictEqual(lvl.essenceAfter, "Enriched essence after level-up.");
    deepStrictEqual(lvl.traitsConsolidated, [t1.id, t2.id]);
    deepStrictEqual(lvl.traitsPromoted, [t3.id]);
    deepStrictEqual(lvl.traitsCarried, [t4.id, t5.id]);
    strictEqual(lvl.traitsMerged.length, 1);
    ok(lvl.traitsMerged[0] > 0);
  });

  it("increments soul level and updates essence", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    const soul = getSoul(db, engId)!;
    strictEqual(soul.level, 1);
    strictEqual(soul.essence, "New");
  });

  it("marks consolidated traits and sets merged_into", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "merged", mergedProvenance: "evidence" },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    const c1 = getTrait(db, t1.id)!;
    const c2 = getTrait(db, t2.id)!;
    strictEqual(c1.status, "consolidated");
    strictEqual(c2.status, "consolidated");
    ok(c1.mergedInto !== null);
    strictEqual(c1.mergedInto, c2.mergedInto);
  });

  it("creates new merged trait as active at new generation", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        {
          sourceTraitIds: [t1.id, t2.id],
          mergedPrinciple: "Merged P",
          mergedProvenance: "Merged E",
        },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    const c1 = getTrait(db, t1.id)!;
    const merged = getTrait(db, c1.mergedInto!)!;
    strictEqual(merged.status, "active");
    strictEqual(merged.generation, 1);
    strictEqual(merged.principle, "Merged P");
    strictEqual(merged.provenance, "Merged E");
  });

  it("marks promoted traits", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    strictEqual(getTrait(db, t3.id)!.status, "promoted");
  });

  it("bumps carried traits to new generation", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    strictEqual(getTrait(db, t4.id)!.generation, 1);
    strictEqual(getTrait(db, t5.id)!.generation, 1);
    strictEqual(getTrait(db, t4.id)!.status, "active");
  });

  it("leaves active traits correct after level-up", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    levelUp(db, engId, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
      ],
      promotedTraitIds: [t3.id],
      carriedTraitIds: [t4.id, t5.id],
    });
    const active = listTraits(db, engId, { status: "active" });
    strictEqual(active.length, 3);
  });

  it("throws when soul not found", () => {
    throws(
      () =>
        levelUp(db, 999, {
          newEssence: "x",
          consolidations: [],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /not found/i,
    );
  });

  it("throws when soul is archived", () => {
    const custom = createSoul(db, { name: "A", essence: "e" });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(
      () =>
        levelUp(db, custom.id, {
          newEssence: "x",
          consolidations: [],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /archived/i,
    );
  });

  it("throws on empty new essence", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t = addTrait(db, s.id, { principle: "p", provenance: "e" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "  ",
          consolidations: [],
          promotedTraitIds: [],
          carriedTraitIds: [t.id],
        }),
      /non-empty new essence/i,
    );
  });

  it("throws on consolidation group with fewer than 2 traits", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t = addTrait(db, s.id, { principle: "p", provenance: "e" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "x",
          consolidations: [{ sourceTraitIds: [t.id], mergedPrinciple: "m", mergedProvenance: "e" }],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /at least 2/i,
    );
  });

  it("throws when a trait ID appears multiple times", () => {
    const { t1, t2, t3, t4, t5 } = setupSoulWithTraits();
    throws(
      () =>
        levelUp(db, engId, {
          newEssence: "x",
          consolidations: [
            { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
          ],
          promotedTraitIds: [t1.id],
          carriedTraitIds: [t3.id, t4.id, t5.id],
        }),
      /multiple times/i,
    );
  });

  it("throws when plan references a non-active trait", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    db.prepare("UPDATE soul_traits SET status = 'reverted' WHERE id = ?").run(t2.id);
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "x",
          consolidations: [],
          promotedTraitIds: [],
          carriedTraitIds: [t1.id, t2.id],
        }),
      /not an active trait/i,
    );
  });

  it("throws when plan does not account for all active traits", () => {
    const { t1, t2, t3, t4 } = setupSoulWithTraits();
    throws(
      () =>
        levelUp(db, engId, {
          newEssence: "x",
          consolidations: [
            { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
          ],
          promotedTraitIds: [t3.id],
          carriedTraitIds: [t4.id],
        }),
      /not accounted for/i,
    );
  });

  it("rolls back on transaction failure — soul unchanged", () => {
    const s = createSoul(db, { name: "S", essence: "original" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });

    throws(() =>
      levelUp(db, s.id, {
        newEssence: "x",
        consolidations: [
          { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
        ],
        promotedTraitIds: [],
        carriedTraitIds: [99999],
      }),
    );

    const soul = getSoul(db, s.id)!;
    strictEqual(soul.level, 0);
    strictEqual(soul.essence, "original");
    strictEqual(getTrait(db, t1.id)!.status, "active");
  });

  it("records merged trait IDs in the level record", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    const t3 = addTrait(db, s.id, { principle: "p3", provenance: "e3" });
    const t4 = addTrait(db, s.id, { principle: "p4", provenance: "e4" });
    const lvl = levelUp(db, s.id, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m1", mergedProvenance: "e1" },
        { sourceTraitIds: [t3.id, t4.id], mergedPrinciple: "m2", mergedProvenance: "e2" },
      ],
      promotedTraitIds: [],
      carriedTraitIds: [],
    });
    strictEqual(lvl.traitsMerged.length, 2);
    const merged1 = getTrait(db, lvl.traitsMerged[0])!;
    const merged2 = getTrait(db, lvl.traitsMerged[1])!;
    strictEqual(merged1.status, "active");
    strictEqual(merged2.status, "active");
    strictEqual(merged1.principle, "m1");
    strictEqual(merged2.principle, "m2");
  });

  it("records empty traitsMerged when no consolidations occur", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const lvl = levelUp(db, s.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id],
    });
    deepStrictEqual(lvl.traitsMerged, []);
  });

  it("handles zero-trait soul — pure essence evolution", () => {
    const bare = createSoul(db, { name: "Bare", essence: "Simple." });
    const lvl = levelUp(db, bare.id, {
      newEssence: "Evolved.",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [],
    });
    strictEqual(lvl.level, 1);
    strictEqual(getSoul(db, bare.id)!.essence, "Evolved.");
    strictEqual(getSoul(db, bare.id)!.level, 1);
  });

  it("handles all-carry plan", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    const lvl = levelUp(db, s.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });
    deepStrictEqual(lvl.traitsCarried, [t1.id, t2.id]);
    deepStrictEqual(lvl.traitsConsolidated, []);
    deepStrictEqual(lvl.traitsPromoted, []);
  });

  it("handles all-promote plan", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    levelUp(db, s.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [t1.id, t2.id],
      carriedTraitIds: [],
    });
    strictEqual(getTrait(db, t1.id)!.status, "promoted");
    strictEqual(getTrait(db, t2.id)!.status, "promoted");
    strictEqual(listTraits(db, s.id, { status: "active" }).length, 0);
  });

  it("handles consecutive level-ups (0 -> 1 -> 2)", () => {
    const s = createSoul(db, { name: "S", essence: "L0" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    levelUp(db, s.id, {
      newEssence: "L1",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });
    const t3 = addTrait(db, s.id, { principle: "p3", provenance: "e3" });
    const lvl2 = levelUp(db, s.id, {
      newEssence: "L2",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "merged", mergedProvenance: "merged-e" },
      ],
      promotedTraitIds: [],
      carriedTraitIds: [t3.id],
    });
    strictEqual(lvl2.level, 2);
    strictEqual(getSoul(db, s.id)!.level, 2);
    strictEqual(getSoul(db, s.id)!.essence, "L2");
    const active = listTraits(db, s.id, { status: "active" });
    strictEqual(active.length, 2);
  });

  it("throws on null plan", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    throws(() => levelUp(db, s.id, null as unknown as LevelUpPlan), /plan.*object/i);
  });

  it("throws on null newEssence", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: null as unknown as string,
          consolidations: [],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /newEssence.*string/i,
    );
  });

  it("throws on null consolidations array", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "x",
          consolidations: null as unknown as [],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /consolidations.*array/i,
    );
  });

  it("throws on empty consolidation mergedPrinciple", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "x",
          consolidations: [
            { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "  ", mergedProvenance: "e" },
          ],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /merged principle/i,
    );
  });

  it("throws on empty consolidation mergedProvenance", () => {
    const s = createSoul(db, { name: "S", essence: "e" });
    const t1 = addTrait(db, s.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, s.id, { principle: "p2", provenance: "e2" });
    throws(
      () =>
        levelUp(db, s.id, {
          newEssence: "x",
          consolidations: [
            { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "  " },
          ],
          promotedTraitIds: [],
          carriedTraitIds: [],
        }),
      /merged provenance/i,
    );
  });
});
