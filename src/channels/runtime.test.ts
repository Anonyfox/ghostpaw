import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { Tool } from "chatoyant";
import { createTool, Schema } from "chatoyant";
import { type BudgetTracker, createBudgetTracker } from "../core/cost.js";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createEventBus, type EventBus } from "../core/events.js";
import { type ChatInstance, createAgentLoop } from "../core/loop.js";
import { createMemoryStore, type MemoryStore } from "../core/memory.js";
import { createRunStore, type RunStore } from "../core/runs.js";
import { createSessionStore, type SessionStore } from "../core/session.js";
import { createToolRegistry, type ToolRegistry } from "../tools/registry.js";
import type { ChannelRuntime } from "./runtime.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let db: GhostpawDatabase;
let sessions: SessionStore;
let memory: MemoryStore;
let eventBus: EventBus;
let runStore: RunStore;
let budget: BudgetTracker;

class EchoParams extends Schema {
  text = Schema.String({ description: "Text to echo" });
}

const echoTool = createTool({
  name: "echo",
  description: "Returns the input",
  // biome-ignore lint: TS index-signature limitation
  parameters: new EchoParams() as any,
  execute: async ({ args }) => {
    const { text } = args as { text: string };
    return { echoed: text };
  },
});

function mockChat(responseText: string): ChatInstance {
  return {
    system() {
      return this;
    },
    user() {
      return this;
    },
    assistant() {
      return this;
    },
    addTool() {},
    async generate() {
      return responseText;
    },
  };
}

/**
 * Lightweight in-memory ChannelRuntime for testing without touching the
 * filesystem or loading real config. Mirrors the real runtime's session
 * resolution and loop wiring using in-memory SQLite.
 */
function createTestRuntime(chatFactory: (model: string) => ChatInstance): ChannelRuntime {
  const baseTools: Tool[] = [echoTool];

  interface SessionEntry {
    sessionId: string;
    loop: ReturnType<typeof createAgentLoop>;
    tools: ToolRegistry;
  }

  const entries = new Map<string, SessionEntry>();

  function resolveSession(sessionKey: string): SessionEntry {
    const existing = entries.get(sessionKey);
    if (existing) return existing;

    const session =
      sessions.getSessionByKey(sessionKey) ??
      sessions.createSession(sessionKey, { model: "test-model" });

    const tools = createToolRegistry();
    for (const t of baseTools) tools.register(t);

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp/test",
      eventBus,
      runs: runStore,
      chatFactory,
    });

    const entry: SessionEntry = { sessionId: session.id, loop, tools };
    entries.set(sessionKey, entry);
    return entry;
  }

  return {
    workspace: "/tmp/test",
    model: "test-model",
    sessions,
    memory,
    eventBus,
    secrets: null as never,
    setModel() {},

    async run(sessionKey: string, text: string): Promise<string> {
      const { sessionId, loop } = resolveSession(sessionKey);
      const result = await loop.run(sessionId, text);
      return result.text ?? "(no response)";
    },

    async *stream(sessionKey: string, text: string): AsyncGenerator<string> {
      const { sessionId, loop } = resolveSession(sessionKey);
      yield* loop.stream(sessionId, text);
    },

    stop(): void {
      entries.clear();
    },
  };
}

beforeEach(async () => {
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  memory = createMemoryStore(db);
  eventBus = createEventBus();
  runStore = createRunStore(db);
  budget = createBudgetTracker({
    maxTokensPerSession: 100_000,
    maxTokensPerDay: 1_000_000,
    warnAtPercentage: 80,
  });
});

// ── Session resolution ───────────────────────────────────────────────────────

describe("ChannelRuntime - session resolution", () => {
  it("creates a new session on first message for a key", async () => {
    const rt = createTestRuntime(() => mockChat("hello"));

    await rt.run("telegram:111", "hi");

    const session = sessions.getSessionByKey("telegram:111");
    ok(session, "session should exist");
    strictEqual(session.key, "telegram:111");
  });

  it("reuses an existing session on subsequent messages", async () => {
    const rt = createTestRuntime(() => mockChat("response"));

    await rt.run("telegram:222", "first");
    await rt.run("telegram:222", "second");

    const all = sessions.listSessions();
    const matching = all.filter((s) => s.key === "telegram:222");
    strictEqual(matching.length, 1, "should have exactly one session for this key");

    const history = sessions.getConversationHistory(matching[0]!.id);
    strictEqual(history.length, 4, "2 user + 2 assistant messages");
  });

  it("maintains independent sessions per key", async () => {
    const rt = createTestRuntime(() => mockChat("ok"));

    await rt.run("telegram:aaa", "message A");
    await rt.run("telegram:bbb", "message B");

    const sessionA = sessions.getSessionByKey("telegram:aaa");
    const sessionB = sessions.getSessionByKey("telegram:bbb");
    ok(sessionA);
    ok(sessionB);
    ok(sessionA.id !== sessionB.id, "sessions should have different IDs");

    const histA = sessions.getConversationHistory(sessionA.id);
    const histB = sessions.getConversationHistory(sessionB.id);
    strictEqual(histA[0]!.content, "message A");
    strictEqual(histB[0]!.content, "message B");
  });

  it("uses different session key namespaces for different channels", async () => {
    const rt = createTestRuntime(() => mockChat("ok"));

    await rt.run("telegram:123", "tg msg");
    await rt.run("discord:123", "dc msg");

    const tg = sessions.getSessionByKey("telegram:123");
    const dc = sessions.getSessionByKey("discord:123");
    ok(tg);
    ok(dc);
    ok(tg.id !== dc.id);
  });
});

// ── Conversation continuity (stickiness) ─────────────────────────────────────

describe("ChannelRuntime - sticky sessions", () => {
  it("accumulates conversation history across multiple turns", async () => {
    let callNum = 0;
    const rt = createTestRuntime(() => {
      callNum++;
      return mockChat(`response ${callNum}`);
    });

    await rt.run("telegram:sticky", "turn 1");
    await rt.run("telegram:sticky", "turn 2");
    await rt.run("telegram:sticky", "turn 3");

    const session = sessions.getSessionByKey("telegram:sticky")!;
    const history = sessions.getConversationHistory(session.id);
    strictEqual(history.length, 6, "3 user + 3 assistant");
    strictEqual(history[0]!.content, "turn 1");
    strictEqual(history[1]!.content, "response 1");
    strictEqual(history[4]!.content, "turn 3");
  });

  it("resumes a pre-existing session from DB (simulates daemon restart)", async () => {
    // Phase 1: first runtime instance creates session + conversation
    const rt1 = createTestRuntime(() => mockChat("first runtime response"));
    await rt1.run("telegram:restart", "before restart");
    rt1.stop();

    // Phase 2: new runtime instance — session already exists in DB
    const rt2 = createTestRuntime(() => mockChat("second runtime response"));
    await rt2.run("telegram:restart", "after restart");

    const session = sessions.getSessionByKey("telegram:restart")!;
    const history = sessions.getConversationHistory(session.id);
    strictEqual(history.length, 4, "2 turns across both runtimes");
    strictEqual(history[0]!.content, "before restart");
    strictEqual(history[2]!.content, "after restart");
  });
});

// ── Concurrency ──────────────────────────────────────────────────────────────

describe("ChannelRuntime - concurrency", () => {
  it("serializes concurrent messages within the same session", async () => {
    const order: string[] = [];

    const rt = createTestRuntime(() => ({
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {},
      async generate() {
        const label = `gen-${order.length}`;
        order.push(label);
        await new Promise((r) => setTimeout(r, 10));
        return label;
      },
    }));

    const [r1, r2, r3] = await Promise.all([
      rt.run("telegram:serial", "a"),
      rt.run("telegram:serial", "b"),
      rt.run("telegram:serial", "c"),
    ]);

    strictEqual(order.length, 3);
    deepStrictEqual(order, ["gen-0", "gen-1", "gen-2"]);
    ok(r1);
    ok(r2);
    ok(r3);
  });

  it("runs different sessions in parallel without blocking", async () => {
    const times: Record<string, number> = {};

    const rt = createTestRuntime(() => ({
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {},
      async generate() {
        const start = Date.now();
        await new Promise((r) => setTimeout(r, 20));
        const duration = Date.now() - start;
        return `took ${duration}ms`;
      },
    }));

    const startAll = Date.now();
    await Promise.all([
      rt.run("telegram:p1", "a").then(() => {
        times.p1 = Date.now() - startAll;
      }),
      rt.run("telegram:p2", "b").then(() => {
        times.p2 = Date.now() - startAll;
      }),
    ]);

    ok(
      times.p1! < 100 && times.p2! < 100,
      "parallel sessions should both finish fast, not sequentially",
    );
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe("ChannelRuntime - error handling", () => {
  it("returns error text when LLM fails, without crashing", async () => {
    const rt = createTestRuntime(() => ({
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {},
      async generate() {
        throw new Error("Provider unreachable");
      },
    }));

    const result = await rt.run("telegram:err", "hi");
    ok(result.includes("Provider unreachable"));
  });

  it("session remains usable after an error", async () => {
    let shouldFail = true;
    const rt = createTestRuntime(() => ({
      system() {
        return this;
      },
      user() {
        return this;
      },
      assistant() {
        return this;
      },
      addTool() {},
      async generate() {
        if (shouldFail) {
          shouldFail = false;
          throw new Error("Transient error");
        }
        return "recovered";
      },
    }));

    const r1 = await rt.run("telegram:recover", "first");
    ok(r1.includes("Transient error"));

    const r2 = await rt.run("telegram:recover", "second");
    strictEqual(r2, "recovered");

    const session = sessions.getSessionByKey("telegram:recover")!;
    const history = sessions.getConversationHistory(session.id);
    strictEqual(history.length, 4, "both exchanges persisted");
  });
});

// ── Budget tracking ──────────────────────────────────────────────────────────

describe("ChannelRuntime - budget tracking", () => {
  it("tracks token usage across sessions", async () => {
    const rt = createTestRuntime(() => mockChat("a response with some tokens in it"));

    await rt.run("telegram:budget1", "hello");
    await rt.run("telegram:budget2", "world");

    const usage = budget.getUsage();
    ok(usage.sessionTokensIn > 0, "should have recorded input tokens");
    ok(usage.sessionTokensOut > 0, "should have recorded output tokens");
  });
});

// ── stop() cleanup ───────────────────────────────────────────────────────────

describe("ChannelRuntime - lifecycle", () => {
  it("stop() clears session cache", async () => {
    const rt = createTestRuntime(() => mockChat("ok"));
    await rt.run("telegram:lifecycle", "hi");
    rt.stop();

    // Session still exists in DB (stop doesn't delete data)
    const session = sessions.getSessionByKey("telegram:lifecycle");
    ok(session, "session persists in DB after stop");
  });
});
