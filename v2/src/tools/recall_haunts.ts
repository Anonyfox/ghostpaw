import { createTool, Schema } from "chatoyant";
import { getHaunt, listHaunts, searchHaunts } from "../core/haunt/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

class RecallHauntsParams extends Schema {
  action = Schema.Enum(["search", "read", "list"] as const, {
    description:
      "'search' finds haunts by keyword in summaries, " +
      "'read' returns the full journal of a specific haunt, " +
      "'list' returns the most recent haunt summaries.",
  });
  query = Schema.String({
    optional: true,
    description: "Keyword to search for in haunt summaries. Required for 'search' action.",
  });
  id = Schema.Integer({
    optional: true,
    description: "Haunt ID to read the full journal of. Required for 'read' action.",
  });
  limit = Schema.Integer({
    optional: true,
    description: "Maximum number of results. Default: 10.",
  });
}

export function createRecallHauntsTool(db: DatabaseHandle) {
  return createTool({
    name: "recall_haunts",
    description:
      "Access previous haunt journals. Use 'list' to see recent haunt summaries, " +
      "'search' to find haunts by keyword, or 'read' to get the full journal " +
      "of a specific haunt by ID. Summaries are brief — use 'read' to dive " +
      "deeper into a specific haunt's thinking.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new RecallHauntsParams() as any,
    execute: async ({ args }) => {
      const { action, query, id, limit } = args as {
        action: "search" | "read" | "list";
        query?: string;
        id?: number;
        limit?: number;
      };

      const effectiveLimit = limit ?? 10;

      if (action === "list") {
        const summaries = listHaunts(db, effectiveLimit);
        if (summaries.length === 0) return { haunts: [], note: "No previous haunts found." };
        return {
          haunts: summaries.map((h) => ({
            id: h.id,
            summary: h.summary,
            date: new Date(h.createdAt).toISOString(),
          })),
        };
      }

      if (action === "search") {
        if (!query || !query.trim()) {
          return { error: "Query is required for search action." };
        }
        const results = searchHaunts(db, query.trim(), effectiveLimit);
        if (results.length === 0) return { haunts: [], note: "No matching haunts found." };
        return {
          haunts: results.map((h) => ({
            id: h.id,
            summary: h.summary,
            date: new Date(h.createdAt).toISOString(),
          })),
        };
      }

      if (action === "read") {
        if (!id || !Number.isInteger(id) || id <= 0) {
          return { error: "A valid haunt ID is required for read action." };
        }
        const haunt = getHaunt(db, id);
        if (!haunt) return { error: `Haunt #${id} not found.` };
        return {
          id: haunt.id,
          journal: haunt.rawJournal,
          summary: haunt.summary,
          date: new Date(haunt.createdAt).toISOString(),
        };
      }

      return { error: `Unknown action: ${action}` };
    },
  });
}
