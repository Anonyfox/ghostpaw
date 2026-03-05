import { createTool, Schema } from "chatoyant";
import { getMemory, supersedeMemories } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";

class ForgetParams extends Schema {
  id = Schema.Integer({
    description:
      "ID of the memory to forget. Get memory IDs from recall results. " +
      "Must be a positive integer.",
  });
}

export function createForgetTool(db: DatabaseHandle) {
  return createTool({
    name: "forget",
    description:
      "Mark a memory as no longer valid. It is excluded from future recall but " +
      "preserved in history. For corrections (replacing wrong info with correct " +
      "info), prefer revise instead — it supersedes and replaces in one step, " +
      "keeping the chain of reasoning intact.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new ForgetParams() as any,
    execute: async ({ args }) => {
      const { id } = args as { id: number };
      if (!Number.isInteger(id) || id <= 0) {
        return { error: "ID must be a positive integer. Use recall to search for memory IDs." };
      }

      const mem = getMemory(db, id);
      if (!mem) return { error: `Memory #${id} not found. Use recall to search for memories.` };
      if (mem.supersededBy !== null) {
        return {
          error: `Memory #${id} is already superseded — it was replaced. Use recall to find the current version.`,
        };
      }

      try {
        supersedeMemories(db, [id]);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to forget memory #${id}: ${detail}` };
      }

      return { forgotten: { id: mem.id, claim: mem.claim } };
    },
  });
}
