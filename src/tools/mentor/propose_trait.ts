import { createTool, Schema } from "chatoyant";
import { getSoulByName } from "../../core/souls/api/read/index.ts";
import { addTrait, citeShard, fadeExhaustedShards } from "../../core/souls/api/write/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ProposeTraitParams extends Schema {
  soul_name = Schema.String({
    description:
      "Exact name of the soul to add the trait to (e.g. 'JS Engineer'). " +
      "Use review_soul first to confirm the name and check trait capacity.",
  });
  principle = Schema.String({
    description:
      "The behavioral principle this trait encodes. Must be specific and actionable, " +
      "not vague or aspirational. Example: 'Always validate function arguments before " +
      "processing' rather than 'Write good code'.",
  });
  provenance = Schema.String({
    description:
      "Evidence justifying this trait: what was observed, when, and why it matters. " +
      "Example: 'Observed repeated crashes from unchecked null inputs in delegation " +
      "runs #12 and #15 on 2026-03-01.' No evidence, no trait.",
  });
  shard_ids = Schema.String({
    description:
      "Optional comma-separated soulshard IDs that support this trait (e.g. '12,17,23'). " +
      "Cite the [shard=N] IDs from the evidence report to create an auditable link " +
      "between accumulated observations and the resulting trait.",
    optional: true,
  });
}

export function createProposeTraitTool(db: DatabaseHandle) {
  return createTool({
    name: "propose_trait",
    description:
      "Add a new trait to a soul. Requires a concrete principle and evidence-based provenance. " +
      "The trait becomes immediately active at the soul's current generation. Returns the new " +
      "trait's ID on success. Use review_soul first to check trait capacity — if the soul is " +
      "at its trait limit, you must revise or revert existing traits before adding new ones. " +
      "When acting on soulshard evidence, pass the relevant shard IDs via shard_ids.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ProposeTraitParams() as any,
    execute: async ({ args }) => {
      const { soul_name, principle, provenance, shard_ids } = args as {
        soul_name: string;
        principle: string;
        provenance: string;
        shard_ids?: string;
      };

      if (!soul_name?.trim()) return { error: "soul_name must not be empty." };
      if (!principle?.trim()) return { error: "principle must not be empty." };
      if (!provenance?.trim()) return { error: "provenance must not be empty." };

      const soul = getSoulByName(db, soul_name.trim());
      if (!soul) {
        return { error: `Soul "${soul_name}" not found. Use review_soul to see available souls.` };
      }

      try {
        const trait = addTrait(db, soul.id, {
          principle: principle.trim(),
          provenance: provenance.trim(),
        });

        const shardIdsParsed = (shard_ids ?? "")
          .split(",")
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));

        for (const shardId of shardIdsParsed) {
          citeShard(db, shardId, trait.id);
        }
        if (shardIdsParsed.length > 0) {
          fadeExhaustedShards(db);
        }

        return {
          added: true,
          traitId: trait.id,
          soulName: soul.name,
          principle: trait.principle,
          generation: trait.generation,
          shardsCited: shardIdsParsed.length,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
