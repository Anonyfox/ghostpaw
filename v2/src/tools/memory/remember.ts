import { createTool, Schema } from "chatoyant";
import type { Memory } from "../../core/memory/index.ts";
import { embedText, searchMemories, storeMemory } from "../../core/memory/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { formatMemoryForAgent } from "./format_memory.ts";

class RememberParams extends Schema {
  claim = Schema.String({
    description:
      "The belief or fact to remember. Write a clear, self-contained statement. " +
      "Example: 'The user prefers tabs over spaces for indentation.'",
  });
  source = Schema.Enum(["explicit", "observed", "inferred"] as const, {
    optional: true,
    description:
      "How this was learned: 'explicit' = user stated it directly, 'observed' = you " +
      "verified it through tool use or evidence, 'inferred' = you concluded it from " +
      "context. Default: 'explicit'.",
  });
  category = Schema.Enum(["preference", "fact", "procedure", "capability", "custom"] as const, {
    optional: true,
    description:
      "Category for organization: 'preference' = user likes/dislikes, 'fact' = verified " +
      "information, 'procedure' = how-to steps, 'capability' = what the user/system can do, " +
      "'custom' = anything else. Default: 'custom'.",
  });
}

export function createRememberTool(db: DatabaseHandle) {
  return createTool({
    name: "remember",
    description:
      "Store a new belief in memory. Returns the stored memory with its ID, plus similar " +
      "existing memories. IMPORTANT: check the similar memories list first — if a match " +
      "exists, use revise to confirm or correct it instead of creating a duplicate. If " +
      "one is outdated, use revise with the old ID and a new claim to replace it.",
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
