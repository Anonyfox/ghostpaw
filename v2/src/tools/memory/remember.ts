import { createTool, Schema } from "chatoyant";
import type { Memory } from "../../core/memory/index.ts";
import { embedText, searchMemories, storeMemory } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemoryForAgent } from "./format_memory.ts";

class RememberParams extends Schema {
  claim = Schema.String({ description: "The belief or fact to remember" });
  source = Schema.Enum(["explicit", "observed", "inferred"] as const, {
    optional: true,
    description:
      "How this was learned: 'explicit' = user stated it, 'observed' = you " +
      "verified it, 'inferred' = you concluded it. Default: explicit.",
  });
  category = Schema.Enum(["preference", "fact", "procedure", "capability", "custom"] as const, {
    optional: true,
    description: "Category for organization. Default: custom.",
  });
}

export function createRememberTool(db: DatabaseHandle) {
  return createTool({
    name: "remember",
    description:
      "Store a new belief in memory. Returns the stored memory plus any similar " +
      "existing memories. Check the similar memories — if one already says the " +
      "same thing, use revise to confirm it instead of storing a duplicate. If " +
      "one is outdated, use revise to correct it.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RememberParams() as any,
    execute: async ({ args }) => {
      const { claim, source, category } = args as {
        claim: string;
        source?: "explicit" | "observed" | "inferred";
        category?: "preference" | "fact" | "procedure" | "capability" | "custom";
      };
      if (!claim || !claim.trim()) return { error: "Claim must not be empty." };

      const embedding = embedText(claim.trim());

      let stored: Memory;
      try {
        stored = storeMemory(db, claim, embedding, {
          source: source ?? "explicit",
          category: category ?? "custom",
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        return { error: `Failed to store memory: ${detail}` };
      }

      const similar = searchMemories(db, embedding, { k: 5, minScore: 0.1 }).filter(
        (m) => m.id !== stored.id,
      );

      return {
        stored: formatMemoryForAgent(stored),
        similar: similar.map((m) => formatMemoryForAgent(m)),
      };
    },
  });
}
