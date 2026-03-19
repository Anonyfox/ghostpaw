import { createTool, Schema } from "chatoyant";
import { citeShard, fadeExhaustedShards, reviseTrait } from "../../core/souls/api/write/index.ts";
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
  shard_ids = Schema.String({
    description:
      "Optional comma-separated soulshard IDs that support this revision (e.g. '12,17'). " +
      "Shards are cited and may fade after enough citations.",
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
      const { trait_id, principle, provenance, shard_ids } = args as {
        trait_id: number;
        principle?: string;
        provenance?: string;
        shard_ids?: string;
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

        const shardIdsParsed = (shard_ids ?? "")
          .split(",")
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));

        for (const shardId of shardIdsParsed) {
          citeShard(db, shardId, revised.id);
        }
        if (shardIdsParsed.length > 0) {
          fadeExhaustedShards(db);
        }

        return {
          revised: true,
          traitId: revised.id,
          principle: revised.principle,
          provenance: revised.provenance,
          shardsCited: shardIdsParsed.length,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
