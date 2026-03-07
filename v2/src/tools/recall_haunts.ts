import { createTool, Schema } from "chatoyant";
import { getHistory, getSession, listSessions, querySessionsPage } from "../core/chat/index.ts";
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
    description: "Haunt session ID to read the full journal of. Required for 'read' action.",
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
        const sessions = listSessions(db, { purpose: "haunt", limit: effectiveLimit });
        if (sessions.length === 0) return { haunts: [], note: "No previous haunts found." };
        return {
          haunts: sessions.map((s) => ({
            id: s.id,
            summary: s.displayName ?? "(no summary)",
            date: new Date(s.createdAt).toISOString(),
          })),
        };
      }

      if (action === "search") {
        if (!query || !query.trim()) {
          return { error: "Query is required for search action." };
        }
        const { sessions } = querySessionsPage(db, {
          filter: { purpose: "haunt", search: query.trim() },
          limit: effectiveLimit,
        });
        if (sessions.length === 0) return { haunts: [], note: "No matching haunts found." };
        return {
          haunts: sessions.map((s) => ({
            id: s.id,
            summary: s.displayName ?? "(no summary)",
            date: new Date(s.createdAt).toISOString(),
          })),
        };
      }

      if (action === "read") {
        if (!id || !Number.isInteger(id) || id <= 0) {
          return { error: "A valid haunt session ID is required for read action." };
        }
        const session = getSession(db, id);
        if (!session || session.purpose !== "haunt") {
          return { error: `Haunt session #${id} not found.` };
        }
        const messages = getHistory(db, id);
        const journal = messages
          .filter((m) => m.role === "assistant")
          .map((m) => m.content)
          .join("\n\n---\n\n");
        return {
          id: session.id,
          journal: journal || "(empty)",
          summary: session.displayName ?? "(no summary)",
          date: new Date(session.createdAt).toISOString(),
        };
      }

      return { error: `Unknown action: ${action}` };
    },
  });
}
