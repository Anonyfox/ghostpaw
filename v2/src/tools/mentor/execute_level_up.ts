import { createTool, Schema } from "chatoyant";
import type { ConsolidationGroup, LevelUpPlan } from "../../core/souls/index.ts";
import { getSoulByName, levelUp } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ExecuteLevelUpParams extends Schema {
  soul_name = Schema.String({
    description:
      "Exact name of the soul to level up (e.g. 'JS Engineer'). " +
      "Use review_soul first to get the current trait list and plan the level-up.",
  });
  new_essence = Schema.String({
    description:
      "The rewritten essence text for the next level. Must preserve the soul's voice " +
      "and subliminal coding while integrating knowledge from promoted and consolidated " +
      "traits. This replaces the current essence entirely.",
  });
  consolidations_json = Schema.String({
    description:
      "JSON array of consolidation groups. Each group merges 2+ related traits into one. " +
      'Format: [{"source_trait_ids": [1, 2], "merged_principle": "Combined principle text", ' +
      '"merged_provenance": "Evidence from both traits"}]. ' +
      'Pass "[]" if no traits are being consolidated.',
  });
  promoted_trait_ids_json = Schema.String({
    description:
      "JSON array of trait IDs whose knowledge is woven into the new essence and no longer " +
      'needed as separate traits. Example: "[3, 4]". Pass "[]" if no traits are promoted.',
  });
  carried_trait_ids_json = Schema.String({
    description:
      "JSON array of trait IDs to carry forward unchanged to the next level. " +
      'Example: "[5, 6]". Pass "[]" if no traits are carried.',
  });
}

interface RawConsolidation {
  source_trait_ids: number[];
  merged_principle: string;
  merged_provenance: string;
}

function parseJsonArray<T>(json: string, label: string): T[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
    return parsed as T[];
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`${label} is not valid JSON: ${err.message}`);
    }
    throw err;
  }
}

export function createExecuteLevelUpTool(db: DatabaseHandle) {
  return createTool({
    name: "execute_level_up",
    description:
      "Execute a level-up for a soul. CRITICAL: every active trait must be accounted for " +
      "exactly once across consolidations, promoted_trait_ids, and carried_trait_ids — " +
      "the level-up fails if any trait is missing or duplicated. The new_essence replaces " +
      "the current essence and must preserve the soul's voice while weaving in promoted " +
      "knowledge. This is irreversible except through revert_level_up (emergency only). " +
      "Use review_soul first to list all active traits and plan the assignment carefully.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ExecuteLevelUpParams() as any,
    execute: async ({ args }) => {
      const {
        soul_name,
        new_essence,
        consolidations_json,
        promoted_trait_ids_json,
        carried_trait_ids_json,
      } = args as {
        soul_name: string;
        new_essence: string;
        consolidations_json: string;
        promoted_trait_ids_json: string;
        carried_trait_ids_json: string;
      };

      if (!soul_name?.trim()) return { error: "soul_name must not be empty." };
      if (!new_essence?.trim()) return { error: "new_essence must not be empty." };

      const soul = getSoulByName(db, soul_name.trim());
      if (!soul) {
        return { error: `Soul "${soul_name}" not found. Use review_soul to see available souls.` };
      }

      let consolidations: RawConsolidation[];
      let promotedTraitIds: number[];
      let carriedTraitIds: number[];
      try {
        consolidations = parseJsonArray<RawConsolidation>(
          consolidations_json ?? "[]",
          "consolidations_json",
        );
        promotedTraitIds = parseJsonArray<number>(
          promoted_trait_ids_json ?? "[]",
          "promoted_trait_ids_json",
        );
        carriedTraitIds = parseJsonArray<number>(
          carried_trait_ids_json ?? "[]",
          "carried_trait_ids_json",
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }

      const plan: LevelUpPlan = {
        newEssence: new_essence.trim(),
        consolidations: consolidations.map(
          (g): ConsolidationGroup => ({
            sourceTraitIds: g.source_trait_ids,
            mergedPrinciple: g.merged_principle,
            mergedProvenance: g.merged_provenance,
          }),
        ),
        promotedTraitIds,
        carriedTraitIds,
      };

      try {
        const level = levelUp(db, soul.id, plan);
        return {
          leveledUp: true,
          soulName: soul.name,
          newLevel: level.level,
          levelRecordId: level.id,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
