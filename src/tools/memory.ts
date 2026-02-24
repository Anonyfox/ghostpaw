import { createTool, Schema } from "chatoyant";
import type { MemoryStore } from "../core/memory.js";
import type { SessionStore } from "../core/session.js";
import type { EmbeddingProvider } from "../lib/embedding.js";

class MemoryParams extends Schema {
  action = Schema.Enum(["remember", "recall", "forget", "history"] as const, {
    description:
      "remember: store a persistent fact. recall: search memories by query. " +
      "forget: delete a memory by id. history: list past chat sessions.",
  });
  content = Schema.String({
    description: "Text to remember or query to recall (required for remember/recall)",
    optional: true,
  });
  id = Schema.String({
    description: "Memory ID to forget (required for forget)",
    optional: true,
  });
}

function formatAge(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export interface MemoryToolConfig {
  memory: MemoryStore;
  sessions: SessionStore;
  embedding: EmbeddingProvider;
}

export function createMemoryTool(config: MemoryToolConfig) {
  const { memory, sessions, embedding } = config;

  return createTool({
    name: "memory",
    description:
      "Persistent memory that survives across sessions. " +
      "Use 'remember' to store important facts, 'recall' to search past memories by meaning, " +
      "'forget' to delete a memory, 'history' to list past chat sessions.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new MemoryParams() as any,
    execute: async ({ args }) => {
      const { action, content, id } = args as {
        action: "remember" | "recall" | "forget" | "history";
        content?: string;
        id?: string;
      };

      switch (action) {
        case "remember": {
          if (!content) return { error: "content is required for remember" };
          const vec = await embedding.embed(content);
          const mem = memory.store(content, vec, { source: "agent" });
          return { stored: mem.id, content: mem.content };
        }

        case "recall": {
          if (!content) return { error: "content/query is required for recall" };
          const queryVec = await embedding.embed(content);
          const matches = memory.search(queryVec, { k: 10, minScore: 0.3, includeGlobal: true });
          if (matches.length === 0) {
            return { _source: "memory", matches: [], message: "No memories found." };
          }
          return {
            _source: "memory",
            _notice:
              "These are past observations. They may be outdated — always verify against current tool output before stating as fact.",
            matches: matches.map((m) => ({
              id: m.id,
              content: m.content,
              score: Math.round(m.score * 1000) / 1000,
              source: m.source,
              age: formatAge(m.createdAt),
              created: new Date(m.createdAt).toISOString(),
            })),
          };
        }

        case "forget": {
          if (!id) return { error: "id is required for forget" };
          memory.delete(id);
          return { deleted: id };
        }

        case "history": {
          const allSessions = sessions.listSessions();
          if (allSessions.length === 0) return { sessions: [], message: "No past sessions." };

          const summaries = allSessions.slice(0, 20).map((s) => {
            const history = sessions.getConversationHistory(s.id);
            const firstUserMsg = history.find((m) => m.role === "user");
            return {
              id: s.id,
              started: new Date(s.createdAt).toISOString(),
              lastActive: new Date(s.lastActive).toISOString(),
              messages: history.length,
              preview: firstUserMsg?.content?.slice(0, 200) ?? "(empty)",
            };
          });

          return { sessions: summaries };
        }
      }
    },
  });
}
