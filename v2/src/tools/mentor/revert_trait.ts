import { createTool, Schema } from "chatoyant";
import { revertTrait } from "../../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class RevertTraitParams extends Schema {
  trait_id = Schema.Integer({
    description:
      "ID of the active trait to revert. Get trait IDs from review_soul. " +
      "Only traits with status 'active' can be reverted.",
  });
}

export function createRevertTraitTool(db: DatabaseHandle) {
  return createTool({
    name: "revert_trait",
    description:
      "Revert an active trait, marking it as reverted (inactive). A revert is as valuable " +
      "as an addition — it removes a principle that is no longer serving the soul well. " +
      "Only active traits can be reverted. The trait keeps its history and can be restored " +
      "later with reactivate_trait if needed. Returns the trait's ID and new status on success.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RevertTraitParams() as any,
    execute: async ({ args }) => {
      const { trait_id } = args as { trait_id: number };

      if (typeof trait_id !== "number" || !Number.isFinite(trait_id) || trait_id < 1) {
        return { error: "trait_id must be a positive integer. Use review_soul to find trait IDs." };
      }

      try {
        const reverted = revertTrait(db, trait_id);
        return {
          reverted: true,
          traitId: reverted.id,
          principle: reverted.principle,
          status: reverted.status,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
