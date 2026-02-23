import { ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createTool, Schema, type Tool } from "chatoyant";
import type { EventBus } from "../core/events.js";
import { createEventBus } from "../core/events.js";
import { type BudgetTracker, createBudgetTracker } from "../core/cost.js";
import type { ChatInstance } from "../core/loop.js";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import { createRunStore, type RunStore } from "../core/runs.js";
import { createSessionStore, type SessionStore } from "../core/session.js";
import { createDelegateTool } from "./delegate.js";

let workDir: string;
let db: GhostpawDatabase;
let sessions: SessionStore;
let runs: RunStore;
let eventBus: EventBus;
let parentSessionId: string;

class PingParams extends Schema {
  message = Schema.String({ description: "Echo" });
}

const pingTool = createTool({
  name: "ping",
  description: "Echo",
  // biome-ignore lint: TS index-signature limitation
  parameters: new PingParams() as any,
  execute: async ({ args }) => ({ pong: (args as { message: string }).message }),
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

function capturingChat(responseText: string) {
  const captured = {
    systemPrompt: "",
    userMessages: [] as string[],
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
    assistant() {
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

async function exec(tool: ReturnType<typeof createDelegateTool>, args: Record<string, unknown>) {
  return tool.execute({ args } as Parameters<ReturnType<typeof createDelegateTool>["execute"]>[0]);
}

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), "ghostpaw-delegate-"));
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  runs = createRunStore(db);
  eventBus = createEventBus();
  parentSessionId = sessions.createSession("parent").id;
});

afterEach(() => {
  db.close();
  rmSync(workDir, { recursive: true, force: true });
});

describe("Delegate tool - metadata", () => {
  it("has correct tool name and description", () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [pingTool],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
    });
    strictEqual(tool.name, "delegate");
    ok(tool.description.includes("delegate"));
    ok(tool.description.includes("cannot delegate further"));
  });

  it("includes available expert names in description", () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "researcher.md"), "You research things.");

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
    });
    ok(tool.description.includes("researcher"));
  });
});

describe("Delegate tool - circuit breaker", () => {
  it("excludes delegate and check_run tools from child agent", async () => {
    const delegateFake = createTool({
      name: "delegate",
      description: "fake",
      // biome-ignore lint: TS index-signature limitation
      parameters: new PingParams() as any,
      execute: async () => ({}),
    });
    const checkRunFake = createTool({
      name: "check_run",
      description: "fake",
      // biome-ignore lint: TS index-signature limitation
      parameters: new PingParams() as any,
      execute: async () => ({}),
    });

    const { chat, captured } = capturingChat("done");
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [pingTool, delegateFake, checkRunFake],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => chat,
    });

    await exec(tool, { task: "work" });
    strictEqual(captured.toolsAdded.length, 1);
    ok(captured.toolsAdded.some((t) => t.name === "ping"));
  });
});

describe("Delegate tool - foreground execution", () => {
  it("executes task and returns result", async () => {
    const { chat, captured } = capturingChat("task completed");
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [pingTool],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => chat,
    });

    const result = (await exec(tool, { task: "do research" })) as { result: string };
    strictEqual(result.result, "task completed");
    ok(captured.userMessages.includes("do research"));
  });

  it("creates a run record (no child session)", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("ok"),
    });

    const result = (await exec(tool, { task: "test" })) as { runId: string };
    const run = runs.get(result.runId);
    ok(run);
    strictEqual(run!.status, "completed");
    strictEqual(run!.agentProfile, "default");
    strictEqual(run!.parentSessionId, parentSessionId);
    strictEqual(run!.sessionId, parentSessionId);
  });

  it("uses agent profile system prompt when specified", async () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "You are a coder. Write clean TypeScript.");

    const { chat, captured } = capturingChat("coded");
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => chat,
    });

    await exec(tool, { task: "write code", agent: "coder" });
    ok(captured.systemPrompt.includes("coder"));
    ok(captured.systemPrompt.includes("TypeScript"));
  });

  it("uses default system prompt when agent is omitted", async () => {
    const { chat, captured } = capturingChat("done");
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => chat,
    });

    await exec(tool, { task: "do something" });
    ok(captured.systemPrompt.includes("ghostpaw"));
  });

  it("returns error for unknown agent profile", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("ok"),
    });

    const result = (await exec(tool, { task: "test", agent: "nonexistent" })) as {
      error: string;
    };
    ok(result.error.includes("Unknown agent"));
  });

  it("uses overridden model when specified", async () => {
    let usedModel = "";
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "gpt-4o",
      sessions,
      runs,
      parentSessionId,
      chatFactory: (model) => {
        usedModel = model;
        return mockChat("ok");
      },
    });

    await exec(tool, { task: "test", model: "claude-3-haiku" });
    strictEqual(usedModel, "claude-3-haiku");
  });

  it("emits delegate:spawn and delegate:done events", async () => {
    const events: string[] = [];
    eventBus.on("delegate:spawn", () => events.push("spawn"));
    eventBus.on("delegate:done", (d) => events.push(`done:${d.status}`));

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("ok"),
      eventBus,
    });

    await exec(tool, { task: "test" });
    strictEqual(events.length, 2);
    strictEqual(events[0], "spawn");
    strictEqual(events[1], "done:completed");
  });

  it("records token usage to budget tracker", async () => {
    const budget = createBudgetTracker({
      maxTokensPerSession: 1_000_000,
      maxTokensPerDay: 10_000_000,
      warnAtPercentage: 80,
    });

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("delegate response text"),
      budget,
    });

    await exec(tool, { task: "do research" });
    const usage = budget.getUsage();
    ok(usage.sessionTokensIn > 0);
    ok(usage.sessionTokensOut > 0);
  });
});

describe("Delegate tool - background execution", () => {
  it("returns immediately with run ID and running status", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("background result"),
      eventBus,
    });

    const result = (await exec(tool, { task: "long task", background: true })) as {
      runId: string;
      status: string;
    };

    strictEqual(result.status, "running");
    ok(result.runId.length > 0);
  });

  it("completes the run in the background", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("background done"),
      eventBus,
    });

    const result = (await exec(tool, { task: "bg task", background: true })) as {
      runId: string;
    };

    await new Promise((r) => setTimeout(r, 50));

    const run = runs.get(result.runId);
    ok(run);
    strictEqual(run!.status, "completed");
    strictEqual(run!.result, "background done");
  });

  it("handles background errors gracefully", async () => {
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
        throw new Error("network failure");
      },
    };

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => errorChat,
      eventBus,
    });

    const result = (await exec(tool, { task: "fail task", background: true })) as {
      runId: string;
    };

    await new Promise((r) => setTimeout(r, 50));

    const run = runs.get(result.runId);
    ok(run);
    strictEqual(run!.status, "failed");
    ok(run!.error!.includes("network failure"));
  });

  it("emits delegate:done event when background run completes", async () => {
    const doneEvents: { status: string }[] = [];
    eventBus.on("delegate:done", (d) => doneEvents.push({ status: d.status }));

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("bg done"),
      eventBus,
    });

    await exec(tool, { task: "bg", background: true });
    await new Promise((r) => setTimeout(r, 50));

    strictEqual(doneEvents.length, 1);
    strictEqual(doneEvents[0]!.status, "completed");
  });

  it("records budget for background runs", async () => {
    const budget = createBudgetTracker({
      maxTokensPerSession: 1_000_000,
      maxTokensPerDay: 10_000_000,
      warnAtPercentage: 80,
    });

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("bg result"),
      eventBus,
      budget,
    });

    await exec(tool, { task: "bg task", background: true });
    await new Promise((r) => setTimeout(r, 50));

    const usage = budget.getUsage();
    ok(usage.sessionTokensIn > 0);
    ok(usage.sessionTokensOut > 0);
  });
});

describe("Delegate tool - error handling", () => {
  it("returns error when foreground execution fails", async () => {
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
        throw new Error("API rate limited");
      },
    };

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => errorChat,
    });

    const result = (await exec(tool, { task: "do something" })) as { error: string };
    ok(result.error.includes("API rate limited"));
    ok(result.error.includes("default"));
  });
});

describe("Delegate tool - dynamic profile discovery", () => {
  it("discovers new agent profiles at execution time", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("ok"),
    });

    // Agent doesn't exist yet
    const r1 = (await exec(tool, { task: "test", agent: "latecomer" })) as { error: string };
    ok(r1.error.includes("Unknown agent"));

    // Create agent after tool was created
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "latecomer.md"), "I arrive late but I work.");

    // Now it should be found
    const r2 = (await exec(tool, { task: "test", agent: "latecomer" })) as { result: string };
    strictEqual(r2.result, "ok");
  });
});
