import { createTool, Schema } from "chatoyant";
import { queueProposal } from "../../core/skills/skill_health.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class QueueProposalParams extends Schema {
  title = Schema.String({
    description: "Short title for the proposed new skill (e.g. 'api-resilience').",
  });
  rationale = Schema.String({
    description: "Why this skill should be created, citing observed evidence.",
  });
  fragmentIds = Schema.String({
    description: "Comma-separated fragment IDs that support this proposal (e.g. '3,7,12').",
  });
}

export function createQueueProposalTool(db: DatabaseHandle) {
  return createTool({
    name: "queue_proposal",
    description:
      "Queue a new-skill proposal from orphan fragment clusters. " +
      "Proposals require user approval before the skill is created.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new QueueProposalParams() as any,
    async execute({ args }) {
      const { title, rationale, fragmentIds } = args as {
        title: string;
        rationale: string;
        fragmentIds: string;
      };

      if (!title?.trim() || !rationale?.trim()) {
        return { error: "title and rationale are required." };
      }

      const ids = (fragmentIds ?? "")
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));

      try {
        queueProposal(db, title.trim(), rationale.trim(), ids);
        return { queued: true, title: title.trim(), fragmentIds: ids };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}
