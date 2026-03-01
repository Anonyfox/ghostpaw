import type { DatabaseHandle } from "../../lib/index.ts";
import { getActiveSoul } from "./get_active_soul.ts";
import { listTraits } from "./list_traits.ts";
import { rowToLevel } from "./row_to_level.ts";
import type { LevelUpPlan, SoulLevel } from "./types.ts";

export function levelUp(db: DatabaseHandle, soulId: number, plan: LevelUpPlan): SoulLevel {
  const soul = getActiveSoul(db, soulId);

  if (!plan || typeof plan !== "object") {
    throw new Error("Level-up plan must be an object.");
  }
  if (typeof plan.newEssence !== "string") {
    throw new Error("Level-up plan must include a newEssence string.");
  }
  const newEssence = plan.newEssence.trim();
  if (newEssence.length === 0) {
    throw new Error("Level-up plan must include a non-empty new essence.");
  }
  if (!Array.isArray(plan.consolidations)) {
    throw new Error("Level-up plan must include a consolidations array.");
  }
  if (!Array.isArray(plan.promotedTraitIds)) {
    throw new Error("Level-up plan must include a promotedTraitIds array.");
  }
  if (!Array.isArray(plan.carriedTraitIds)) {
    throw new Error("Level-up plan must include a carriedTraitIds array.");
  }

  for (let i = 0; i < plan.consolidations.length; i++) {
    const group = plan.consolidations[i];
    if (group.sourceTraitIds.length < 2) {
      throw new Error(
        `Consolidation group ${i} must have at least 2 source traits. Got ${group.sourceTraitIds.length}.`,
      );
    }
    if (group.mergedPrinciple.trim().length === 0) {
      throw new Error(`Consolidation group ${i} must have a non-empty merged principle.`);
    }
    if (group.mergedProvenance.trim().length === 0) {
      throw new Error(`Consolidation group ${i} must have a non-empty merged provenance.`);
    }
  }

  const allPlanIds = new Set<number>();
  const addId = (id: number, source: string) => {
    if (allPlanIds.has(id)) {
      throw new Error(
        `Trait #${id} appears multiple times in the level-up plan (duplicate in ${source}).`,
      );
    }
    allPlanIds.add(id);
  };

  for (const group of plan.consolidations) {
    for (const id of group.sourceTraitIds) addId(id, "consolidations");
  }
  for (const id of plan.promotedTraitIds) addId(id, "promoted");
  for (const id of plan.carriedTraitIds) addId(id, "carried");

  const activeTraits = listTraits(db, soulId, { status: "active" });
  const activeIds = new Set(activeTraits.map((t) => t.id));

  for (const id of allPlanIds) {
    if (!activeIds.has(id)) {
      throw new Error(`Trait #${id} is not an active trait of soul ID ${soulId}.`);
    }
  }
  for (const id of activeIds) {
    if (!allPlanIds.has(id)) {
      throw new Error(`Active trait #${id} is not accounted for in the level-up plan.`);
    }
  }

  const essenceBefore = soul.essence;
  const newLevel = soul.level + 1;
  const now = Date.now();
  const consolidatedIds: number[] = [];
  const mergedIds: number[] = [];
  const promotedIds: number[] = plan.promotedTraitIds;
  const carriedIds: number[] = plan.carriedTraitIds;

  let levelRowId: number;

  db.exec("BEGIN");
  try {
    for (const group of plan.consolidations) {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        )
        .run(
          soulId,
          group.mergedPrinciple.trim(),
          group.mergedProvenance.trim(),
          newLevel,
          now,
          now,
        );

      const mergedId = Number(lastInsertRowid);
      mergedIds.push(mergedId);
      for (const sourceId of group.sourceTraitIds) {
        db.prepare(
          "UPDATE soul_traits SET status = 'consolidated', merged_into = ?, updated_at = ? WHERE id = ?",
        ).run(mergedId, now, sourceId);
        consolidatedIds.push(sourceId);
      }
    }

    for (const id of promotedIds) {
      db.prepare("UPDATE soul_traits SET status = 'promoted', updated_at = ? WHERE id = ?").run(
        now,
        id,
      );
    }

    for (const id of carriedIds) {
      db.prepare("UPDATE soul_traits SET generation = ?, updated_at = ? WHERE id = ?").run(
        newLevel,
        now,
        id,
      );
    }

    db.prepare("UPDATE souls SET essence = ?, level = ?, updated_at = ? WHERE id = ?").run(
      newEssence,
      newLevel,
      now,
      soulId,
    );

    ({ lastInsertRowid: levelRowId } = db
      .prepare(
        `INSERT INTO soul_levels
         (soul_id, level, essence_before, essence_after, traits_consolidated, traits_promoted, traits_carried, traits_merged, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        soulId,
        newLevel,
        essenceBefore,
        newEssence,
        JSON.stringify(consolidatedIds),
        JSON.stringify(promotedIds),
        JSON.stringify(carriedIds),
        JSON.stringify(mergedIds),
        now,
      ));

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const row = db.prepare("SELECT * FROM soul_levels WHERE id = ?").get(levelRowId);
  return rowToLevel(row as Record<string, unknown>);
}
