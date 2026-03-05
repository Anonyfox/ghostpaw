import { createTool, Schema } from "chatoyant";
import { reviseTrait } from "../../core/souls/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ReviseTraitParams extends Schema {
  trait_id = Schema.Integer({
    description:
      "ID of the active trait to revise. Get trait IDs from review_soul. " +
      "Only traits with status 'active' can be revised.",
  });
  principle = Schema.String({
    description: "Updated principle text. Omit to keep the current principle unchanged.",
    optional: true,
  });
  provenance = Schema.String({
    description: "Updated provenance/evidence text. Omit to keep the current provenance unchanged.",
    optional: true,
  });
}

export function createReviseTraitTool(db: DatabaseHandle) {
  return createTool({
    name: "revise_trait",
    description:
      "Revise an active trait's principle and/or provenance. At least one field must be " +
      "provided. Only traits with status 'active' can be revised — consolidated, promoted, " +
      "and reverted traits cannot be revised (use reactivate_trait first to restore a " +
      "reverted trait, then revise it). Returns the updated trait on success.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReviseTraitParams() as any,
    execute: async ({ args }) => {
      const { trait_id, principle, provenance } = args as {
        trait_id: number;
        principle?: string;
        provenance?: string;
      };

      if (typeof trait_id !== "number" || !Number.isFinite(trait_id) || trait_id < 1) {
        return { error: "trait_id must be a positive integer. Use review_soul to find trait IDs." };
      }
      if (principle == null && provenance == null) {
        return { error: "At least one of principle or provenance must be provided." };
      }

      try {
        const revised = reviseTrait(db, trait_id, {
          principle: principle?.trim() || undefined,
          provenance: provenance?.trim() || undefined,
        });
        return {
          revised: true,
          traitId: revised.id,
          principle: revised.principle,
          provenance: revised.provenance,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
