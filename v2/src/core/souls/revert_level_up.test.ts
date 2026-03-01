import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addTrait } from "./add_trait.ts";
import { createSoul } from "./create_soul.ts";
import { ensureMandatorySouls } from "./ensure_mandatory_souls.ts";
import { getLevelHistory } from "./get_level_history.ts";
import { getSoul } from "./get_soul.ts";
import { getTrait } from "./get_trait.ts";
import { levelUp } from "./level_up.ts";
import { reactivateTrait } from "./reactivate_trait.ts";
import { revertLevelUp } from "./revert_level_up.ts";
import { initSoulsTables } from "./schema.ts";

let db: DatabaseHandle;

describe("revertLevelUp", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initSoulsTables(db);
    ensureMandatorySouls(db);
  });

  it("restores soul to pre-level-up state", () => {
    const eng = createSoul(db, { name: "Eng", essence: "Original." });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });
    const t3 = addTrait(db, eng.id, { principle: "p3", provenance: "e3" });

    levelUp(db, eng.id, {
      newEssence: "Evolved.",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "merged", mergedProvenance: "merged-e" },
      ],
      promotedTraitIds: [],
      carriedTraitIds: [t3.id],
    });

    const reverted = revertLevelUp(db, eng.id);
    strictEqual(reverted.level, 0);
    strictEqual(reverted.essence, "Original.");
  });

  it("restores consolidated traits and deletes merged trait", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });
    const t3 = addTrait(db, eng.id, { principle: "p3", provenance: "e3" });

    levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "m", mergedProvenance: "e" },
      ],
      promotedTraitIds: [],
      carriedTraitIds: [t3.id],
    });

    const mergedId = getTrait(db, t1.id)!.mergedInto!;
    revertLevelUp(db, eng.id);

    strictEqual(getTrait(db, t1.id)!.status, "active");
    strictEqual(getTrait(db, t1.id)!.mergedInto, null);
    strictEqual(getTrait(db, t2.id)!.status, "active");
    strictEqual(getTrait(db, mergedId), null);
  });

  it("restores promoted traits", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });

    levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [t1.id],
      carriedTraitIds: [t2.id],
    });

    revertLevelUp(db, eng.id);
    strictEqual(getTrait(db, t1.id)!.status, "active");
  });

  it("decrements carried trait generation", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });

    levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });
    strictEqual(getTrait(db, t1.id)!.generation, 1);

    revertLevelUp(db, eng.id);
    strictEqual(getTrait(db, t1.id)!.generation, 0);
  });

  it("deletes the level-up record", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });

    levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });
    strictEqual(getLevelHistory(db, eng.id).length, 1);

    revertLevelUp(db, eng.id);
    strictEqual(getLevelHistory(db, eng.id).length, 0);
  });

  it("throws when soul not found", () => {
    throws(() => revertLevelUp(db, 999), /not found/i);
  });

  it("throws when soul is at level 0", () => {
    const fresh = createSoul(db, { name: "Fresh", essence: "" });
    throws(() => revertLevelUp(db, fresh.id), /level 0/i);
  });

  it("throws when soul is archived", () => {
    const custom = createSoul(db, { name: "A", essence: "e" });
    const t = addTrait(db, custom.id, { principle: "p", provenance: "e" });
    levelUp(db, custom.id, {
      newEssence: "x",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t.id],
    });
    db.prepare("UPDATE souls SET deleted_at = ? WHERE id = ?").run(Date.now(), custom.id);
    throws(() => revertLevelUp(db, custom.id), /archived/i);
  });

  it("handles consecutive reverts (level 2 -> 1 -> 0)", () => {
    const eng = createSoul(db, { name: "Eng", essence: "L0" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });

    levelUp(db, eng.id, {
      newEssence: "L1",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });
    const t3 = addTrait(db, eng.id, { principle: "p3", provenance: "e3" });
    levelUp(db, eng.id, {
      newEssence: "L2",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id, t3.id],
    });
    strictEqual(getSoul(db, eng.id)!.level, 2);

    revertLevelUp(db, eng.id);
    strictEqual(getSoul(db, eng.id)!.level, 1);
    strictEqual(getSoul(db, eng.id)!.essence, "L1");
    strictEqual(getLevelHistory(db, eng.id).length, 1);

    revertLevelUp(db, eng.id);
    strictEqual(getSoul(db, eng.id)!.level, 0);
    strictEqual(getSoul(db, eng.id)!.essence, "L0");
    strictEqual(getLevelHistory(db, eng.id).length, 0);
  });

  it("deletes merged traits even when all source traits were manually reactivated", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });
    const t3 = addTrait(db, eng.id, { principle: "p3", provenance: "e3" });

    const lvl = levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [
        { sourceTraitIds: [t1.id, t2.id], mergedPrinciple: "merged", mergedProvenance: "merged-e" },
      ],
      promotedTraitIds: [],
      carriedTraitIds: [t3.id],
    });

    const mergedId = lvl.traitsMerged[0];
    reactivateTrait(db, t1.id);
    reactivateTrait(db, t2.id);
    strictEqual(getTrait(db, t1.id)!.mergedInto, null);
    strictEqual(getTrait(db, t2.id)!.mergedInto, null);

    revertLevelUp(db, eng.id);

    strictEqual(getTrait(db, mergedId), null);
    strictEqual(getTrait(db, t1.id)!.status, "active");
    strictEqual(getTrait(db, t2.id)!.status, "active");
    strictEqual(getSoul(db, eng.id)!.level, 0);
  });

  it("preserves post-level-up modifications", () => {
    const eng = createSoul(db, { name: "Eng", essence: "e" });
    const t1 = addTrait(db, eng.id, { principle: "p1", provenance: "e1" });
    const t2 = addTrait(db, eng.id, { principle: "p2", provenance: "e2" });

    levelUp(db, eng.id, {
      newEssence: "New",
      consolidations: [],
      promotedTraitIds: [],
      carriedTraitIds: [t1.id, t2.id],
    });

    const t3 = addTrait(db, eng.id, {
      principle: "post-levelup trait",
      provenance: "new evidence",
    });
    revertLevelUp(db, eng.id);

    const postLevelupTrait = getTrait(db, t3.id);
    strictEqual(postLevelupTrait!.status, "active");
    strictEqual(postLevelupTrait!.principle, "post-levelup trait");
  });
});
