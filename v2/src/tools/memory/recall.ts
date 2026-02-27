import { createTool, Schema } from "chatoyant";
import { recallMemories } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemoryForAgent } from "./format_memory.ts";

class RecallParams extends Schema {
  query = Schema.String({ description: "What to search for in memory" });
}

export function createRecallTool(db: DatabaseHandle) {
  return createTool({
    name: "recall",
    description:
      "Search memories for relevant beliefs. Returns top matches ranked by relevance, " +
      "confidence, and freshness. Most memory retrieval happens automatically before " +
      "you respond — only use this for targeted follow-up searches when you need " +
      "something specific.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RecallParams() as any,
    execute: async ({ args }) => {
      const { query } = args as { query: string };
      if (!query || !query.trim()) return { error: "Query must not be empty." };

      const results = recallMemories(db, query.trim());

      if (results.length === 0) {
        return { memories: [], note: "No relevant memories found." };
      }

      return { memories: results.map((m) => formatMemoryForAgent(m)) };
    },
  });
}
