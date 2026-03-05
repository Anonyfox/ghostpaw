import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { Tool } from "chatoyant";
import { buildChat } from "./build_chat.ts";
import type { ChatInstance } from "./chat_instance.ts";
import type { ChatMessage } from "./types.ts";

interface CallLog {
  method: string;
  arg: string;
}

function createMockChat(): { instance: ChatInstance; calls: CallLog[]; tools: unknown[] } {
  const calls: CallLog[] = [];
  const tools: unknown[] = [];
  const instance: ChatInstance = {
    system(content: string) {
      calls.push({ method: "system", arg: content });
      return this;
    },
    user(content: string) {
      calls.push({ method: "user", arg: content });
      return this;
    },
    assistant(content: string) {
      calls.push({ method: "assistant", arg: content });
      return this;
    },
    addTool(tool: unknown) {
      tools.push(tool);
      return this;
    },
    async generate() {
      return "";
    },
    async *stream() {
      yield "";
    },
    get lastResult() {
      return null;
    },
    get messages() {
      return [];
    },
  };
  return { instance, calls, tools };
}

function msg(role: "user" | "assistant", content: string): ChatMessage {
  return {
    id: 1,
    sessionId: 1,
    parentId: null,
    role,
    content,
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    costUsd: 0,
    createdAt: Date.now(),
    isCompaction: false,
    toolData: null,
  };
}

describe("buildChat", () => {
  it("sets the system prompt first", () => {
    const mock = createMockChat();
    const factory = () => mock.instance;
    buildChat([], "You are helpful.", "gpt-4o", [], factory);
    strictEqual(mock.calls[0]!.method, "system");
    strictEqual(mock.calls[0]!.arg, "You are helpful.");
  });

  it("replays history in order after system prompt", () => {
    const mock = createMockChat();
    const factory = () => mock.instance;
    const history = [msg("user", "hello"), msg("assistant", "hi"), msg("user", "how are you?")];
    buildChat(history, "sys", "gpt-4o", [], factory);
    deepStrictEqual(mock.calls, [
      { method: "system", arg: "sys" },
      { method: "user", arg: "hello" },
      { method: "assistant", arg: "hi" },
      { method: "user", arg: "how are you?" },
    ]);
  });

  it("adds tools after messages", () => {
    const mock = createMockChat();
    const factory = () => mock.instance;
    const fakeTool = { name: "test_tool" } as unknown as Tool;
    buildChat([], "sys", "gpt-4o", [fakeTool], factory);
    strictEqual(mock.tools.length, 1);
    strictEqual((mock.tools[0] as { name: string }).name, "test_tool");
  });

  it("passes model to the factory", () => {
    let receivedModel = "";
    const mock = createMockChat();
    const factory = (model: string) => {
      receivedModel = model;
      return mock.instance;
    };
    buildChat([], "sys", "claude-sonnet-4-20250514", [], factory);
    strictEqual(receivedModel, "claude-sonnet-4-20250514");
  });

  it("works with empty history and no tools", () => {
    const mock = createMockChat();
    const factory = () => mock.instance;
    const result = buildChat([], "sys", "gpt-4o", [], factory);
    strictEqual(mock.calls.length, 1);
    strictEqual(mock.tools.length, 0);
    strictEqual(result, mock.instance);
  });
});
