import { createTool, Schema } from "chatoyant";
import { formatSoulEvidence, gatherSoulEvidence } from "../../core/souls/api/read/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ReviewSoulParams extends Schema {
  soul_name = Schema.String({
    description:
      "Exact name of the soul to review (e.g. 'JS Engineer', 'Ghostpaw', 'Prompt Engineer').",
  });
}

export function createReviewSoulTool(db: DatabaseHandle) {
  return createTool({
    name: "review_soul",
    description:
      "Gather evidence about a soul's current state. Returns a detailed report including: " +
      "delegation stats (success/failure rates), all traits with IDs and statuses " +
      "(active/reverted/consolidated/promoted), level history with essence snapshots, " +
      "trait capacity (used/limit), and related memories. Always call this BEFORE any " +
      "propose_trait, revise_trait, revert_trait, reactivate_trait, execute_level_up, " +
      "or revert_level_up action — you need the trait IDs and current state to act correctly.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ReviewSoulParams() as any,
    execute: async ({ args }) => {
      const { soul_name } = args as { soul_name: string };
      if (!soul_name || !soul_name.trim()) {
        return { error: "soul_name must not be empty." };
      }

      try {
        const evidence = gatherSoulEvidence(db, soul_name.trim());
        return { report: formatSoulEvidence(evidence) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: detail };
      }
    },
  });
}
