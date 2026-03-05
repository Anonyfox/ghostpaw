import { createTool, Schema } from "chatoyant";
import { reactivateTrait } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ReactivateTraitParams extends Schema {
  trait_id = Schema.Integer({
    description:
      "ID of the trait to reactivate. Must be a reverted, consolidated, or promoted trait " +
      "(not already active). Get trait IDs from review_soul.",
  });
}

export function createReactivateTraitTool(db: DatabaseHandle) {
  return createTool({
    name: "reactivate_trait",
    description:
      "Restore a previously reverted or retired trait to active status. Use review_soul first " +
      "to see which traits are inactive and their IDs. A reactivated trait returns to the " +
      "soul's active trait set at the current generation. Returns the trait's ID, principle, " +
      "and new status on success.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReactivateTraitParams() as any,
    execute: async ({ args }) => {
      const { trait_id } = args as { trait_id: number };

      if (typeof trait_id !== "number" || !Number.isFinite(trait_id) || trait_id < 1) {
        return { error: "trait_id must be a positive integer. Use review_soul to find trait IDs." };
      }

      try {
        const trait = reactivateTrait(db, trait_id);
        return {
          reactivated: true,
          traitId: trait.id,
          principle: trait.principle,
          status: trait.status,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
