import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { Tool } from "chatoyant";
import { createTool, Schema } from "chatoyant";
import { createToolRegistry, type ToolRegistry } from "../tools/registry.js";
import { type BudgetTracker, createBudgetTracker } from "./cost.js";
import { createDatabase, type GhostpawDatabase } from "./database.js";
import { type ChatInstance, createAgentLoop } from "./loop.js";
import { createSessionStore, type SessionStore } from "./session.js";

let db: GhostpawDatabase;
let sessions: SessionStore;
let tools: ToolRegistry;
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

function streamingMockChat(chunks: string[]): ChatInstance {
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
      return chunks.join("");
    },
    async *stream() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
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
  db = await createDatabase(":memory:");
  sessions = createSessionStore(db);
  tools = createToolRegistry();
  budget = createBudgetTracker({
    maxTokensPerSession: 100_000,
    maxTokensPerDay: 1_000_000,
    warnAtPercentage: 80,
  });

  tools.register(echoTool);
});

describe("AgentLoop - basic text response", () => {
  it("sends a prompt and receives a text response", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => mockChat("Hello! I can help."),
    });
    const session = sessions.createSession("test");

    const result = await loop.run(session.id, "Hi there");
    strictEqual(result.text, "Hello! I can help.");
  });

  it("persists messages to the session", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => mockChat("response"),
    });
    const session = sessions.createSession("test");

    await loop.run(session.id, "prompt");
    const history = sessions.getConversationHistory(session.id);
    strictEqual(history.length, 2);
    strictEqual(history[0]!.role, "user");
    strictEqual(history[0]!.content, "prompt");
    strictEqual(history[1]!.role, "assistant");
    strictEqual(history[1]!.content, "response");
  });

  it("records token usage", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => mockChat("a response that has some length to it for token estimation"),
    });
    const session = sessions.createSession("test");

    await loop.run(session.id, "hi");
    const usage = budget.getUsage();
    ok(usage.sessionTokensIn > 0);
    ok(usage.sessionTokensOut > 0);
  });
});

describe("AgentLoop - conversation continuity", () => {
  it("replays previous messages to the chat", async () => {
    let callCount = 0;
    const { chat: chat1 } = capturingChat("first response");
    const { chat: chat2, captured: cap2 } = capturingChat("second response");

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => {
        callCount++;
        return callCount === 1 ? chat1 : chat2;
      },
    });
    const session = sessions.createSession("test");

    await loop.run(session.id, "first message");
    await loop.run(session.id, "second message");

    ok(cap2.userMessages.includes("first message"));
    ok(cap2.assistantMessages.includes("first response"));
    ok(cap2.userMessages.includes("second message"));
  });
});

describe("AgentLoop - tool registration", () => {
  it("registers all tools with the chat", async () => {
    const { chat, captured } = capturingChat("done");

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => chat,
    });
    const session = sessions.createSession("test");

    await loop.run(session.id, "do something");
    strictEqual(captured.toolsAdded.length, tools.list().length);
    ok(captured.toolsAdded.some((t) => t.name === "echo"));
  });
});

describe("AgentLoop - system prompt", () => {
  it("assembles and passes system prompt to chat", async () => {
    const { chat, captured } = capturingChat("done");

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => chat,
    });
    const session = sessions.createSession("test");

    await loop.run(session.id, "hi");
    ok(captured.systemPrompt.includes("ghostpaw"));
  });
});

describe("AgentLoop - budget enforcement", () => {
  it("reports budget exceeded when limit is hit", async () => {
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
      workspacePath: "/tmp",
      chatFactory: () =>
        mockChat("This is a response that will generate enough estimated tokens to exceed budget"),
    });
    const session = sessions.createSession("test");

    const result = await loop.run(session.id, "hi");
    ok(result.budgetExceeded);
  });
});

describe("AgentLoop - error handling", () => {
  it("handles Chat.generate() errors gracefully", async () => {
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
        throw new Error("API connection failed");
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => errorChat,
    });
    const session = sessions.createSession("test");

    const result = await loop.run(session.id, "hi");
    ok(result.text?.includes("API connection failed"));
  });
});

describe("AgentLoop - streaming", () => {
  it("yields chunks in order", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => streamingMockChat(["He", "llo", " world", "!"]),
    });
    const session = sessions.createSession("test");

    const chunks: string[] = [];
    const gen = loop.stream(session.id, "hi");
    let next = await gen.next();
    while (!next.done) {
      chunks.push(next.value);
      next = await gen.next();
    }

    strictEqual(chunks.length, 4);
    strictEqual(chunks[0], "He");
    strictEqual(chunks[1], "llo");
    strictEqual(chunks[2], " world");
    strictEqual(chunks[3], "!");
  });

  it("persists the full accumulated text after streaming", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => streamingMockChat(["Hello", " ", "world"]),
    });
    const session = sessions.createSession("test");

    const gen = loop.stream(session.id, "hi");
    // drain the generator
    let next = await gen.next();
    while (!next.done) next = await gen.next();

    const history = sessions.getConversationHistory(session.id);
    const assistantMsg = history.find((m) => m.role === "assistant");
    strictEqual(assistantMsg?.content, "Hello world");
  });

  it("records budget after stream completes", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => streamingMockChat(["Some ", "streamed ", "content"]),
    });
    const session = sessions.createSession("test");

    const gen = loop.stream(session.id, "hi");
    let next = await gen.next();
    while (!next.done) next = await gen.next();

    const usage = budget.getUsage();
    ok(usage.sessionTokensIn > 0);
    ok(usage.sessionTokensOut > 0);
  });

  it("returns RunResult when generator completes", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => streamingMockChat(["ok"]),
    });
    const session = sessions.createSession("test");

    const gen = loop.stream(session.id, "hi");
    let next = await gen.next();
    while (!next.done) next = await gen.next();

    const result = next.value;
    strictEqual(result.text, "ok");
    strictEqual(result.budgetExceeded, false);
  });

  it("falls back to generate when stream is not available", async () => {
    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => mockChat("fallback response"),
    });
    const session = sessions.createSession("test");

    const gen = loop.stream(session.id, "hi");
    const chunks: string[] = [];
    let next = await gen.next();
    while (!next.done) {
      chunks.push(next.value);
      next = await gen.next();
    }

    strictEqual(chunks.length, 0);
    strictEqual(next.value.text, "fallback response");
  });

  it("handles stream errors gracefully", async () => {
    const errorStreamChat: ChatInstance = {
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
        return "";
      },
      async *stream() {
        yield "partial";
        throw new Error("Stream interrupted");
      },
    };

    const loop = createAgentLoop({
      model: "test-model",
      sessions,
      tools,
      budget,
      workspacePath: "/tmp",
      chatFactory: () => errorStreamChat,
    });
    const session = sessions.createSession("test");

    const gen = loop.stream(session.id, "hi");
    const chunks: string[] = [];
    let next = await gen.next();
    while (!next.done) {
      chunks.push(next.value);
      next = await gen.next();
    }

    strictEqual(chunks.length, 1);
    strictEqual(chunks[0], "partial");
    // The partial text is persisted
    const history = sessions.getConversationHistory(session.id);
    ok(history.some((m) => m.role === "assistant" && m.content === "partial"));
  });
});
