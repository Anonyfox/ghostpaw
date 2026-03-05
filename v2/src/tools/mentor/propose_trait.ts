import { createTool, Schema } from "chatoyant";
import { addTrait, getSoulByName } from "../../core/souls/index.ts";
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
}

export function createProposeTraitTool(db: DatabaseHandle) {
  return createTool({
    name: "propose_trait",
    description:
      "Add a new trait to a soul. Requires a concrete principle and evidence-based provenance. " +
      "The trait becomes immediately active at the soul's current generation. Returns the new " +
      "trait's ID on success. Use review_soul first to check trait capacity — if the soul is " +
      "at its trait limit, you must revise or revert existing traits before adding new ones.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ProposeTraitParams() as any,
    execute: async ({ args }) => {
      const { soul_name, principle, provenance } = args as {
        soul_name: string;
        principle: string;
        provenance: string;
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
        return {
          added: true,
          traitId: trait.id,
          soulName: soul.name,
          principle: trait.principle,
          generation: trait.generation,
        };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
