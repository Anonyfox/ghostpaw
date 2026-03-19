import { createTool, Schema } from "chatoyant";
import { getSoulByName } from "../../core/souls/api/read/index.ts";
import { revertLevelUp } from "../../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class RevertLevelUpParams extends Schema {
  soul_name = Schema.String({
    description:
      "Name of the soul whose most recent level-up should be reverted " +
      "(e.g. 'JS Engineer', 'Ghostpaw'). Use review_soul first to confirm the current level.",
  });
}

export function createRevertLevelUpTool(db: DatabaseHandle) {
  return createTool({
    name: "revert_level_up",
    description:
      "EMERGENCY: Revert the most recent level-up for a soul. This rolls back the essence " +
      "to its previous version, un-consolidates and un-promotes traits, and decrements the " +
      "level. The level-up's new essence text is permanently lost. Only use this when a " +
      "level-up went clearly wrong — for example, if the new essence lost the soul's voice " +
      "or critical traits were incorrectly consolidated. Use review_soul first to verify " +
      "the current state. Returns the soul's new (reverted) level on success.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RevertLevelUpParams() as any,
    execute: async ({ args }) => {
      const { soul_name } = args as { soul_name: string };

      if (!soul_name?.trim()) {
        return { error: "soul_name must not be empty. Use review_soul to see available souls." };
      }

      const soul = getSoulByName(db, soul_name.trim());
      if (!soul) {
        return {
          error: `Soul "${soul_name}" not found. Use review_soul to see available soul names.`,
        };
      }

      try {
        const reverted = revertLevelUp(db, soul.id);
        return {
          reverted: true,
          soulName: reverted.name,
          newLevel: reverted.level,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
