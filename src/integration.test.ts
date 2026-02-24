import { ok, strictEqual } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Tool } from "chatoyant";
import { assembleSystemPrompt } from "./core/context.js";
import { type BudgetTracker, createBudgetTracker } from "./core/cost.js";
import { createDatabase, type GhostpawDatabase } from "./core/database.js";
import { createEventBus, type EventBus } from "./core/events.js";
import { type ChatInstance, createAgentLoop } from "./core/loop.js";
import { createMemoryStore, type MemoryStore } from "./core/memory.js";
import { createRunStore, type RunStore } from "./core/runs.js";
import { createSessionStore, type SessionStore } from "./core/session.js";
import { createCheckRunTool } from "./tools/check_run.js";
import { createDelegateTool } from "./tools/delegate.js";
import { createReadTool } from "./tools/read.js";
import { createToolRegistry, type ToolRegistry } from "./tools/registry.js";
import { createWriteTool } from "./tools/write.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

let db: GhostpawDatabase;
let sessions: SessionStore;
let memory: MemoryStore;
let tools: ToolRegistry;
let budget: BudgetTracker;
let workDir: string;
let eventBus: EventBus;
let runStore: RunStore;

function fakeEmbedding(seed: number, dims = 8): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dims; i++) vec.push(Math.sin(seed * (i + 1) * 0.7));
  return vec;
}

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

function sequenceMockChats(responses: string[]) {
  let idx = 0;
  return () => {
    const text = responses[idx] ?? responses[responses.length - 1]!;
    idx++;
    return mockChat(text);
  };
}

function capturingChat(responseText: string) {
  const captured = {
    systemPrompt: "",
    userMessages: [] as string[],
    assistantMessages: [] as string[],
    toolsAdded: [] as Tool[],
  };

  const chat: ChatInstance = {
    system(content: string) {
      captured.systemPrompt = content;
      return chat;
    },
    user(content: string) {
      captured.userMessages.push(content);
      return chat;
    },
    assistant(content: string) {
      captured.assistantMessages.push(content);
      return chat;
    },
    addTool(tool: Tool) {
      captured.toolsAdded.push(tool);
    },
    async generate() {
      return responseText;
    },
  };

  return { chat, captured };
}

beforeEach(async () => {
  workDir = join(tmpdir(), `ghostpaw-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(workDir, { recursive: true });

  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  memory = createMemoryStore(db);
  tools = createToolRegistry();
  eventBus = createEventBus();
  runStore = createRunStore(db);
  budget = createBudgetTracker({
    maxTokensPerSession: 500_000,
    maxTokensPerDay: 2_000_000,
    warnAtPercentage: 80,
  });
});

afterEach(() => {
  db.close();
  rmSync(workDir, { recursive: true, force: true });
});

// ── Integration: Multi-turn conversation ─────────────────────────────────────

describe("Integration: multi-turn conversation with file tools", () => {
  it("maintains conversation across turns with tool registration", async () => {
    tools.register(createWriteTool(workDir));
    tools.register(createReadTool(workDir));

    const chatFactory = sequenceMockChats(["I wrote the file.", "The file says: Hello!"]);

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory,
    });
    const session = sessions.createSession("int-test-1");

    const r1 = await loop.run(session.id, "Create a hello.txt file");
    strictEqual(r1.text, "I wrote the file.");

    const r2 = await loop.run(session.id, "Read hello.txt back to me");
    strictEqual(r2.text, "The file says: Hello!");

    const history = sessions.getConversationHistory(session.id);
    ok(history.length >= 4);

    const roles = history.map((m) => m.role);
    ok(roles.includes("user"));
    ok(roles.includes("assistant"));
  });

  it("registers all tools with each Chat instance", async () => {
    tools.register(createWriteTool(workDir));
    tools.register(createReadTool(workDir));

    const { chat, captured } = capturingChat("done");
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => chat,
    });
    const session = sessions.createSession("int-test-tools");

    await loop.run(session.id, "do something");
    strictEqual(captured.toolsAdded.length, 2);
    ok(captured.toolsAdded.some((t) => t.name === "write"));
    ok(captured.toolsAdded.some((t) => t.name === "read"));
  });
});

// ── Integration: Memory store with session lifecycle ─────────────────────────

describe("Integration: memory persistence across sessions", () => {
  it("stores memories globally, retrieves from any session", () => {
    memory.store("TypeScript uses .ts extension", fakeEmbedding(1), { source: "conversation" });
    memory.store("Python uses .py extension", fakeEmbedding(2), { source: "conversation" });
    memory.store("Rust uses .rs extension", fakeEmbedding(3), { source: "conversation" });

    const results = memory.search(fakeEmbedding(1), { k: 1 });
    strictEqual(results.length, 1);
    strictEqual(results[0]!.content, "TypeScript uses .ts extension");
    ok(results[0]!.score > 0.99);
  });

  it("scoped memories survive session deletion but global ones persist", () => {
    const sess = sessions.createSession("temp-sess");

    memory.store("Global fact", fakeEmbedding(10));
    memory.store("Session fact", fakeEmbedding(20), { sessionId: sess.id });

    sessions.deleteSession(sess.id);

    strictEqual(memory.count(), 1);
    const remaining = memory.list();
    strictEqual(remaining[0]!.content, "Global fact");
  });

  it("search with includeGlobal combines session and global memories", () => {
    memory.store("Global knowledge", fakeEmbedding(1));
    memory.store("Session-specific", fakeEmbedding(1.1), { sessionId: "s1" });
    memory.store("Other session", fakeEmbedding(100), { sessionId: "s2" });

    const results = memory.search(fakeEmbedding(1), {
      k: 10,
      sessionId: "s1",
      includeGlobal: true,
    });

    strictEqual(results.length, 2);
    const contents = results.map((r) => r.content);
    ok(contents.includes("Global knowledge"));
    ok(contents.includes("Session-specific"));
    ok(!contents.includes("Other session"));
  });
});

// ── Integration: Context assembly with workspace files ───────────────────────

describe("Integration: context assembly with workspace files", () => {
  it("loads SOUL.md and skill index into the system prompt", () => {
    writeFileSync(join(workDir, "SOUL.md"), "You are a coding assistant called Ghost.");
    mkdirSync(join(workDir, "skills"), { recursive: true });
    writeFileSync(
      join(workDir, "skills", "testing.md"),
      "# Testing\nAlways write tests first (TDD).",
    );
    writeFileSync(join(workDir, "skills", "style.md"), "# Code Style\nUse TypeScript strict mode.");

    const prompt = assembleSystemPrompt(workDir);

    ok(prompt.includes("Ghost"));
    ok(prompt.includes("testing.md"));
    ok(prompt.includes("Testing"));
    ok(prompt.includes("style.md"));
    ok(prompt.includes("Code Style"));
    ok(prompt.includes("2 skills"));
    ok(!prompt.includes("TDD"), "full skill body should NOT be in prompt");
  });

  it("includes budget summary when approaching limit", () => {
    const prompt = assembleSystemPrompt(workDir, "Session: 85000 / 100000 (85%)");

    ok(prompt.includes("85%"));
    ok(prompt.includes("Budget"));
  });
});

// ── Integration: Budget enforcement during multi-step tool use ───────────────

describe("Integration: budget enforcement stops runaway loops", () => {
  it("detects budget exceeded and reports it", async () => {
    const tightBudget = createBudgetTracker({
      maxTokensPerSession: 10,
      maxTokensPerDay: 1_000_000,
      warnAtPercentage: 80,
    });

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget: tightBudget,
      workspacePath: workDir,
      chatFactory: () =>
        mockChat("A longer response that generates enough estimated tokens to exceed budget"),
    });
    const session = sessions.createSession("budget-test");

    const result = await loop.run(session.id, "Do something");
    ok(result.budgetExceeded);
  });
});

// ── Integration: Conversation branching with message tree ────────────────────

describe("Integration: conversation branching", () => {
  it("supports branching and rewinding conversation history", async () => {
    const chatFactory = sequenceMockChats(["Response A", "Response B", "Response C from branch"]);

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory,
    });
    const session = sessions.createSession("branch-test");

    await loop.run(session.id, "First message");
    const historyAfterFirst = sessions.getConversationHistory(session.id);
    const firstUserMsgId = historyAfterFirst[0]!.id;

    await loop.run(session.id, "Second message");
    const historyAfterSecond = sessions.getConversationHistory(session.id);
    strictEqual(historyAfterSecond.length, 4);

    sessions.setHead(session.id, firstUserMsgId);
    const rewound = sessions.getConversationHistory(session.id);
    strictEqual(rewound.length, 1);
    strictEqual(rewound[0]!.content, "First message");

    await loop.run(session.id, "Branch message");
    const branched = sessions.getConversationHistory(session.id);
    ok(branched.length >= 2);
    ok(branched.some((m) => m.content === "Branch message"));
    ok(branched.some((m) => m.content === "Response C from branch"));
    ok(!branched.some((m) => m.content === "Second message"));
  });
});

// ── Integration: Memory search performance ───────────────────────────────────

describe("Integration: memory search at scale", () => {
  it("handles hundreds of memories efficiently", () => {
    for (let i = 0; i < 500; i++) {
      memory.store(`Fact number ${i}`, fakeEmbedding(i));
    }

    strictEqual(memory.count(), 500);

    const start = performance.now();
    const results = memory.search(fakeEmbedding(250), { k: 5 });
    const elapsed = performance.now() - start;

    strictEqual(results.length, 5);
    ok(elapsed < 100, `Search took ${elapsed.toFixed(1)}ms, expected < 100ms`);

    strictEqual(results[0]!.content, "Fact number 250");
    ok(results[0]!.score > 0.99);
  });
});

// ── Integration: Multiple sessions share one database ────────────────────────

describe("Integration: multiple concurrent sessions", () => {
  it("two sessions maintain independent conversation histories", async () => {
    let callCount = 0;

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => {
        callCount++;
        return mockChat(`Response #${callCount}`);
      },
    });
    const s1 = sessions.createSession("session-1");
    const s2 = sessions.createSession("session-2");

    await loop.run(s1.id, "Hello from session 1");
    await loop.run(s2.id, "Hello from session 2");
    await loop.run(s1.id, "Second message in session 1");

    const h1 = sessions.getConversationHistory(s1.id);
    const h2 = sessions.getConversationHistory(s2.id);

    strictEqual(h1.length, 4);
    strictEqual(h2.length, 2);

    ok(h1.some((m) => m.content === "Hello from session 1"));
    ok(h1.some((m) => m.content === "Second message in session 1"));
    ok(!h1.some((m) => m.content === "Hello from session 2"));

    ok(h2.some((m) => m.content === "Hello from session 2"));
    ok(!h2.some((m) => m.content === "Hello from session 1"));
  });
});

// ── Integration: Error handling ──────────────────────────────────────────────

describe("Integration: error handling in agent loop", () => {
  it("handles Chat.generate() errors and persists error message", async () => {
    const errorChat: ChatInstance = {
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
        throw new Error("Provider connection lost");
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => errorChat,
    });
    const session = sessions.createSession("error-test");

    const result = await loop.run(session.id, "do something");
    ok(result.text?.includes("Provider connection lost"));

    const history = sessions.getConversationHistory(session.id);
    ok(history.some((m) => m.role === "assistant" && m.content?.includes("Provider connection")));
  });
});

// ── Integration: Compaction ──────────────────────────────────────────────────

describe("Integration: automatic compaction", () => {
  it("compacts history when token threshold is exceeded", async () => {
    const compactCalls: string[] = [];

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("ok"),
      compactionThreshold: 500,
      compactFn: async (prompt) => {
        compactCalls.push(prompt);
        return "Summary: the user discussed various topics.";
      },
    });
    const session = sessions.createSession("compact-test");

    // Seed many large messages to exceed the threshold
    for (let i = 0; i < 20; i++) {
      sessions.addMessage(session.id, {
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i}: ${"lorem ipsum dolor sit amet ".repeat(20)}`,
        parentId: sessions.getConversationHistory(session.id).at(-1)?.id,
      });
    }

    await loop.run(session.id, "trigger compaction");

    // compactFn should have been called
    strictEqual(compactCalls.length, 1);
    ok(compactCalls[0]!.includes("Summarize"));

    // A compaction message should exist in the history
    const history = sessions.getConversationHistory(session.id);
    ok(history.some((m) => m.isCompaction && m.content?.includes("Summary")));
  });

  it("skips compaction when below threshold", async () => {
    let compactCalled = false;

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("ok"),
      compactionThreshold: 999_999,
      compactFn: async () => {
        compactCalled = true;
        return "summary";
      },
    });
    const session = sessions.createSession("no-compact");

    await loop.run(session.id, "short message");
    strictEqual(compactCalled, false);
  });

  it("skips compaction when no compactFn is provided", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("ok"),
      compactionThreshold: 1,
    });
    const session = sessions.createSession("no-fn");

    // Should not throw despite threshold being exceeded
    const result = await loop.run(session.id, "hi");
    strictEqual(result.text, "ok");
  });
});

// ── Integration: EventBus observability ──────────────────────────────────────

describe("Integration: EventBus fires during agent loop", () => {
  it("emits run:start and run:end events", async () => {
    const events: string[] = [];
    eventBus.on("run:start", () => events.push("start"));
    eventBus.on("run:end", () => events.push("end"));

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("response"),
      eventBus,
    });
    const session = sessions.createSession("event-test");

    await loop.run(session.id, "hi");
    strictEqual(events.length, 2);
    strictEqual(events[0], "start");
    strictEqual(events[1], "end");
  });

  it("emits run:error on failure", async () => {
    const errors: string[] = [];
    eventBus.on("run:error", (d) => errors.push(d.error));

    const errorChat: ChatInstance = {
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
        throw new Error("boom");
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => errorChat,
      eventBus,
    });
    const session = sessions.createSession("error-event-test");

    await loop.run(session.id, "hi");
    strictEqual(errors.length, 1);
    ok(errors[0]!.includes("boom"));
  });

  it("emits stream:chunk events during streaming", async () => {
    const chunks: string[] = [];
    eventBus.on("stream:chunk", (d) => chunks.push(d.chunk));

    const streamChat: ChatInstance = {
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
        return "Hello";
      },
      async *stream() {
        yield "He";
        yield "llo";
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => streamChat,
      eventBus,
    });
    const session = sessions.createSession("stream-event-test");

    const gen = loop.stream(session.id, "hi");
    let next = await gen.next();
    while (!next.done) next = await gen.next();

    strictEqual(chunks.length, 2);
    strictEqual(chunks[0], "He");
    strictEqual(chunks[1], "llo");
  });
});

// ── Integration: Run tracking in SQLite ──────────────────────────────────────

describe("Integration: RunStore tracks loop executions", () => {
  it("creates and completes a run record for each loop.run()", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("tracked"),
      runs: runStore,
    });
    const session = sessions.createSession("run-track-test");

    await loop.run(session.id, "do something");

    const allRuns = runStore.getCompletedDelegations(session.id);
    // Main runs have no parentSessionId, so this returns 0
    strictEqual(allRuns.length, 0);

    // But we can query directly: the run for this session should be completed
    const run = db.sqlite
      .prepare("SELECT * FROM runs WHERE session_id = ?")
      .get(session.id) as Record<string, unknown>;
    ok(run);
    strictEqual(run.status, "completed");
    strictEqual(run.prompt, "do something");
  });

  it("marks run as failed when generate throws", async () => {
    const errorChat: ChatInstance = {
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
        throw new Error("provider down");
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => errorChat,
      runs: runStore,
    });
    const session = sessions.createSession("run-fail-test");

    await loop.run(session.id, "failing prompt");

    const run = db.sqlite
      .prepare("SELECT * FROM runs WHERE session_id = ?")
      .get(session.id) as Record<string, unknown>;
    ok(run);
    strictEqual(run.status, "failed");
    ok((run.error as string).includes("provider down"));
  });
});

// ── Integration: Session serialization ───────────────────────────────────────

describe("Integration: per-session serialization", () => {
  it("serializes concurrent runs on the same session", async () => {
    const order: number[] = [];
    let callCount = 0;

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => {
        const myIdx = ++callCount;
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
            // First call takes longer to simulate overlapping
            if (myIdx === 1) await new Promise((r) => setTimeout(r, 50));
            order.push(myIdx);
            return `response-${myIdx}`;
          },
        } as ChatInstance;
      },
    });
    const session = sessions.createSession("serial-test");

    // Fire both concurrently — the lock should serialize them
    const [r1, r2] = await Promise.all([
      loop.run(session.id, "first"),
      loop.run(session.id, "second"),
    ]);

    strictEqual(order.length, 2);
    strictEqual(order[0], 1);
    strictEqual(order[1], 2);
    strictEqual(r1.text, "response-1");
    strictEqual(r2.text, "response-2");
  });

  it("allows concurrent runs on different sessions", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => mockChat("concurrent"),
    });
    const s1 = sessions.createSession("sess-a");
    const s2 = sessions.createSession("sess-b");

    const [r1, r2] = await Promise.all([loop.run(s1.id, "msg 1"), loop.run(s2.id, "msg 2")]);

    strictEqual(r1.text, "concurrent");
    strictEqual(r2.text, "concurrent");
  });
});

// ── Integration: Delegation with agent profiles ──────────────────────────────

describe("Integration: delegate tool with agent profiles", () => {
  it("foreground delegation runs a named expert and returns result", async () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "researcher.md"), "You are a thorough researcher.");

    const parentSession = sessions.createSession("main-agent");

    const delegateTool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs: runStore,
      parentSessionId: parentSession.id,
      chatFactory: () => mockChat("research result: found 5 items"),
      eventBus,
    });

    const result = (await delegateTool.execute({
      args: { task: "research TypeScript frameworks", agent: "researcher" },
      // biome-ignore lint: chatoyant ToolInput cast
    } as any)) as { result: string; agent: string; runId: string };

    strictEqual(result.agent, "researcher");
    ok(result.result.includes("found 5 items"));

    const run = runStore.get(result.runId);
    ok(run);
    strictEqual(run!.status, "completed");
    strictEqual(run!.agentProfile, "researcher");
    strictEqual(run!.parentSessionId, parentSession.id);
  });

  it("background delegation completes asynchronously and is queryable", async () => {
    const parentSession = sessions.createSession("bg-parent");

    const delegateTool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs: runStore,
      parentSessionId: parentSession.id,
      chatFactory: () => mockChat("background result"),
      eventBus,
    });
    const checkTool = createCheckRunTool(runStore);

    const spawnResult = (await delegateTool.execute({
      args: { task: "long research", background: true },
      // biome-ignore lint: chatoyant ToolInput cast
    } as any)) as { runId: string; status: string };

    strictEqual(spawnResult.status, "running");

    // Let background promise settle
    await new Promise((r) => setTimeout(r, 50));

    // check_run should show completed
    const checkResult = (await checkTool.execute({
      args: { run_id: spawnResult.runId },
      // biome-ignore lint: chatoyant ToolInput cast
    } as any)) as { status: string; result: string };

    strictEqual(checkResult.status, "completed");
    strictEqual(checkResult.result, "background result");

    // And it should appear in completed delegations
    const delegations = runStore.getCompletedDelegations(parentSession.id);
    strictEqual(delegations.length, 1);
    strictEqual(delegations[0]!.result, "background result");
  });

  it("completed background tasks are injected into system prompt", async () => {
    const parentSession = sessions.createSession("announce-parent");

    const run = runStore.create({
      sessionId: parentSession.id,
      prompt: "research task",
      agentProfile: "researcher",
      parentSessionId: parentSession.id,
    });
    runStore.complete(run.id, "Found 3 relevant papers on the topic.");

    const { chat, captured } = capturingChat("acknowledged");
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: workDir,
      chatFactory: () => chat,
      runs: runStore,
    });

    await loop.run(parentSession.id, "what did the researcher find?");

    ok(captured.systemPrompt.includes("Completed Background Tasks"));
    ok(captured.systemPrompt.includes("researcher"));
    ok(captured.systemPrompt.includes("3 relevant papers"));

    // Run should now be marked as announced
    strictEqual(runStore.getCompletedDelegations(parentSession.id).length, 0);
  });
});
