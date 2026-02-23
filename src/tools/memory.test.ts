import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createMemoryStore, type MemoryStore } from "../core/memory.js";
import { createSessionStore, type SessionStore } from "../core/session.js";
import { createEmbeddingProvider, type EmbeddingProvider } from "../lib/embedding.js";
import { createMemoryTool } from "./memory.js";

let db: GhostpawDatabase;
let memory: MemoryStore;
let sessions: SessionStore;
let embedding: EmbeddingProvider;

type ToolType = ReturnType<typeof createMemoryTool>;

async function exec(tool: ToolType, args: Record<string, unknown>) {
  return tool.execute({ args } as Parameters<ToolType["execute"]>[0]);
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  memory = createMemoryStore(db);
  sessions = createSessionStore(db);
  embedding = createEmbeddingProvider();
});

afterEach(() => {
  db.close();
});

describe("memory tool - metadata", () => {
  it("has correct name and description", () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    strictEqual(tool.name, "memory");
    ok(tool.description.includes("memory"));
  });
});

describe("memory tool - remember", () => {
  it("stores a memory and returns its id", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "remember", content: "The sky is blue" })) as {
      stored: string;
      content: string;
    };
    ok(result.stored);
    strictEqual(result.content, "The sky is blue");
    strictEqual(memory.count(), 1);
  });

  it("returns error when content is missing", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "remember" })) as { error: string };
    ok(result.error.includes("content"));
  });
});

describe("memory tool - recall", () => {
  it("finds stored memories by query similarity", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    await exec(tool, {
      action: "remember",
      content: "TypeScript is a typed superset of JavaScript",
    });
    await exec(tool, { action: "remember", content: "Python is used for data science" });

    const result = (await exec(tool, { action: "recall", content: "TypeScript" })) as {
      matches: Array<{ id: string; content: string; score: number }>;
    };
    ok(result.matches.length > 0);
    ok(result.matches[0].content.includes("TypeScript"));
  });

  it("returns empty when no memories exist", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "recall", content: "anything" })) as {
      matches: unknown[];
      message: string;
    };
    deepStrictEqual(result.matches, []);
    ok(result.message.includes("No memories"));
  });

  it("returns error when content is missing", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "recall" })) as { error: string };
    ok(result.error.includes("content"));
  });
});

describe("memory tool - forget", () => {
  it("deletes a memory by id", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const stored = (await exec(tool, { action: "remember", content: "temporary note" })) as {
      stored: string;
    };

    const result = (await exec(tool, { action: "forget", id: stored.stored })) as {
      deleted: string;
    };
    strictEqual(result.deleted, stored.stored);
    strictEqual(memory.count(), 0);
  });

  it("returns error when id is missing", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "forget" })) as { error: string };
    ok(result.error.includes("id"));
  });

  it("handles non-existent id gracefully", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "forget", id: "nonexistent" })) as {
      deleted: string;
    };
    strictEqual(result.deleted, "nonexistent");
  });
});

describe("memory tool - history", () => {
  it("returns empty when no sessions exist", async () => {
    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "history" })) as {
      sessions: unknown[];
      message: string;
    };
    deepStrictEqual(result.sessions, []);
    ok(result.message.includes("No past"));
  });

  it("lists sessions with preview of first user message", async () => {
    const session = sessions.createSession("test-session");
    const msg1 = sessions.addMessage(session.id, { role: "user", content: "What is Ghostpaw?" });
    sessions.addMessage(session.id, {
      role: "assistant",
      content: "I am Ghostpaw.",
      parentId: msg1.id,
    });

    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "history" })) as {
      sessions: Array<{ id: string; preview: string; messages: number }>;
    };
    strictEqual(result.sessions.length, 1);
    strictEqual(result.sessions[0].preview, "What is Ghostpaw?");
    strictEqual(result.sessions[0].messages, 2);
  });

  it("shows multiple sessions", async () => {
    const s1 = sessions.createSession("session-1");
    sessions.addMessage(s1.id, { role: "user", content: "First chat" });

    const s2 = sessions.createSession("session-2");
    sessions.addMessage(s2.id, { role: "user", content: "Second chat" });

    const tool = createMemoryTool({ memory, sessions, embedding });
    const result = (await exec(tool, { action: "history" })) as {
      sessions: Array<{ preview: string }>;
    };
    strictEqual(result.sessions.length, 2);
    const previews = result.sessions.map((s) => s.preview).sort();
    deepStrictEqual(previews, ["First chat", "Second chat"]);
  });
});
