import { ok, strictEqual } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createTool, Schema, type Tool } from "chatoyant";
import { createBudgetTracker } from "../core/cost.js";
import { createDatabase, type GhostpawDatabase } from "../core/database.js";
import type { EventBus } from "../core/events.js";
import { createEventBus } from "../core/events.js";
import type { ChatInstance } from "../core/loop.js";
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
  let systemContent = "";
  let userContent = "";
  return {
    system(content: string) {
      systemContent = content;
      return this;
    },
    user(content: string) {
      userContent = content;
      return this;
    },
    assistant() {
      return this;
    },
    addTool() {},
    async generate() {
      return responseText;
    },
    get messages() {
      return [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
        { role: "assistant", content: responseText },
      ];
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
    get messages() {
      return [
        { role: "system", content: captured.systemPrompt },
        ...captured.userMessages.map((u) => ({ role: "user" as const, content: u })),
        { role: "assistant" as const, content: responseText },
      ];
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
    ok(tool.description.includes("Delegate"));
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
  it("executes task and returns completed result", async () => {
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

    const result = (await exec(tool, { task: "do research" })) as string;
    ok(typeof result === "string");
    ok(result.includes("completed successfully"));
    ok(result.includes("task completed"));
    ok(captured.userMessages.includes("do research"));
  });

  it("creates a run record linked to child session with token counts", async () => {
    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => mockChat("ok"),
    });

    await exec(tool, { task: "test" });
    const allRuns = runs.getCompletedDelegations(parentSessionId);
    ok(allRuns.length > 0);
    const run = allRuns[0]!;
    strictEqual(run.status, "completed");
    strictEqual(run.agentProfile, "default");
    strictEqual(run.parentSessionId, parentSessionId);
    ok(run.childSessionId, "run should link to child session");

    const childSession = sessions.getSession(run.childSessionId!);
    ok(childSession, "child session should exist");
    strictEqual(childSession!.purpose, "delegate");
    ok(
      childSession!.tokensIn > 0 || childSession!.tokensOut > 0,
      "child session should have tokens",
    );

    const history = sessions.getConversationHistory(run.childSessionId!);
    ok(history.length >= 2, "child session should have persisted messages");
    const assistantMsg = history.find((m) => m.role === "assistant");
    ok(assistantMsg, "should have assistant message");
    ok(
      assistantMsg!.tokensIn > 0 || assistantMsg!.tokensOut > 0,
      "assistant message should have token counts",
    );
  });

  it("uses agent profile as soul override when specified", async () => {
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

  it("composes agent profile with environment and memory guidance", async () => {
    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder Soul\nYou write code.");

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
    ok(captured.systemPrompt.includes("# Coder Soul"));
    ok(captured.systemPrompt.includes("## Environment"));
    ok(captured.systemPrompt.includes("## Memory"));
  });

  it("composes agent profile with skills when available", async () => {
    mkdirSync(join(workDir, "agents"));
    mkdirSync(join(workDir, "skills"));
    writeFileSync(join(workDir, "agents", "coder.md"), "# Coder Soul");
    writeFileSync(join(workDir, "skills", "testing.md"), "# Testing Guide\nHow to test.");

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

    await exec(tool, { task: "write tests", agent: "coder" });
    ok(captured.systemPrompt.includes("# Coder Soul"));
    ok(captured.systemPrompt.includes("## Skills"));
    ok(captured.systemPrompt.includes("testing.md"));
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
    ok(captured.systemPrompt.includes("Ghostpaw"));
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
      maxCostPerDay: 0,
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

    await new Promise((r) => setTimeout(r, 20));

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

    await new Promise((r) => setTimeout(r, 20));

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
    await new Promise((r) => setTimeout(r, 20));

    strictEqual(doneEvents.length, 1);
    strictEqual(doneEvents[0]!.status, "completed");
  });

  it("records budget for background runs", async () => {
    const budget = createBudgetTracker({
      maxTokensPerSession: 1_000_000,
      maxTokensPerDay: 10_000_000,
      warnAtPercentage: 80,
      maxCostPerDay: 0,
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
    await new Promise((r) => setTimeout(r, 20));

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

    const result = (await exec(tool, { task: "do something" })) as {
      status: string;
      error: string;
      agent: string;
    };
    strictEqual(result.status, "failed");
    strictEqual(result.agent, "default");
    ok(result.error.includes("API rate limited"));
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

    const r1 = (await exec(tool, { task: "test", agent: "latecomer" })) as { error: string };
    ok(r1.error.includes("Unknown agent"));

    mkdirSync(join(workDir, "agents"));
    writeFileSync(join(workDir, "agents", "latecomer.md"), "I arrive late but I work.");

    const r2 = (await exec(tool, { task: "test", agent: "latecomer" })) as string;
    ok(typeof r2 === "string");
    ok(r2.includes("ok"));
  });
});

describe("Delegate tool - timeout", () => {
  it("applies custom timeout on slow sub-agent", async () => {
    let generateCalled = false;
    const slowChat: ChatInstance = {
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
        generateCalled = true;
        await new Promise((r) => setTimeout(r, 500));
        return "slow result";
      },
    };

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => slowChat,
    });

    const result = (await exec(tool, { task: "slow", timeout: 0.05 })) as {
      status: string;
      error: string;
    };
    ok(generateCalled);
    strictEqual(result.status, "failed");
    ok(result.error.includes("timed out"));
  });

  it("foreground delegation times out on hung sub-agent", async () => {
    const hungChat: ChatInstance = {
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
      generate() {
        return new Promise(() => {});
      },
    };

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => hungChat,
    });

    const result = (await exec(tool, { task: "hung", timeout: 0.05 })) as {
      status: string;
      error: string;
    };
    strictEqual(result.status, "failed");
    ok(result.error.includes("timed out"));
  });

  it("background delegation times out with custom timeout", async () => {
    const hungChat: ChatInstance = {
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
      generate() {
        return new Promise(() => {});
      },
    };

    const tool = createDelegateTool({
      workspacePath: workDir,
      tools: [],
      defaultModel: "test-model",
      sessions,
      runs,
      parentSessionId,
      chatFactory: () => hungChat,
      eventBus,
    });

    const result = (await exec(tool, { task: "bg hung", background: true, timeout: 0.05 })) as {
      runId: string;
    };
    ok(result.runId);

    await new Promise((r) => setTimeout(r, 100));

    const run = runs.get(result.runId);
    ok(run);
    strictEqual(run!.status, "failed");
    ok(run!.error!.includes("timed out"));
  });
});
