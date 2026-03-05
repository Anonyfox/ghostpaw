import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { ChatMessage } from "../chat/types.ts";
import { formatConversation } from "./format_conversation.ts";

function msg(
  overrides: Partial<ChatMessage> & { role: ChatMessage["role"]; content: string },
): ChatMessage {
  return {
    id: 1,
    sessionId: 1,
    parentId: null,
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    reasoningTokens: 0,
    cachedTokens: 0,
    costUsd: 0,
    createdAt: Date.now(),
    isCompaction: false,
    toolData: null,
    ...overrides,
  };
}

describe("formatConversation", () => {
  it("returns empty string for empty input", () => {
    strictEqual(formatConversation([]), "");
  });

  it("formats a single user message", () => {
    const result = formatConversation([msg({ role: "user", content: "hello" })]);
    strictEqual(result, "User: hello");
  });

  it("formats user and assistant messages with labels", () => {
    const result = formatConversation([
      msg({ role: "user", content: "hi" }),
      msg({ role: "assistant", content: "hello there" }),
    ]);
    strictEqual(result, "User: hi\n\nAgent: hello there");
  });

  it("filters out tool_call messages", () => {
    const result = formatConversation([
      msg({ role: "user", content: "do something" }),
      msg({ role: "tool_call", content: '{"name":"test"}' }),
      msg({ role: "assistant", content: "done" }),
    ]);
    strictEqual(result, "User: do something\n\nAgent: done");
  });

  it("filters out tool_result messages", () => {
    const result = formatConversation([
      msg({ role: "user", content: "check" }),
      msg({ role: "tool_result", content: "result data" }),
      msg({ role: "assistant", content: "here you go" }),
    ]);
    strictEqual(result, "User: check\n\nAgent: here you go");
  });

  it("filters out compaction messages", () => {
    const result = formatConversation([
      msg({ role: "user", content: "first" }),
      msg({ role: "assistant", content: "summary", isCompaction: true }),
      msg({ role: "user", content: "second" }),
    ]);
    strictEqual(result, "User: first\n\nUser: second");
  });

  it("truncates individual messages over 2000 chars", () => {
    const long = "x".repeat(3000);
    const result = formatConversation([msg({ role: "user", content: long })]);
    ok(result.includes("[...]"));
    ok(result.length < 3000);
    ok(result.startsWith(`User: ${"x".repeat(2000)}`));
  });

  it("caps total output at 40000 chars", () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 100; i++) {
      messages.push(msg({ role: "user", content: "a".repeat(1000), id: i }));
    }
    const result = formatConversation(messages);
    ok(result.length <= 40_000 + 30);
    ok(result.includes("[conversation truncated]"));
  });

  it("preserves message ordering", () => {
    const result = formatConversation([
      msg({ role: "user", content: "first" }),
      msg({ role: "assistant", content: "second" }),
      msg({ role: "user", content: "third" }),
    ]);
    const firstIdx = result.indexOf("first");
    const secondIdx = result.indexOf("second");
    const thirdIdx = result.indexOf("third");
    ok(firstIdx < secondIdx);
    ok(secondIdx < thirdIdx);
  });

  it("returns empty string when all messages are tool messages", () => {
    const result = formatConversation([
      msg({ role: "tool_call", content: "call" }),
      msg({ role: "tool_result", content: "result" }),
    ]);
    strictEqual(result, "");
  });
});
