import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import type { Message } from "./session.js";
import { compactMessages, shouldCompact } from "./compaction.js";

function msg(i: number, overrides: Partial<Message> = {}): Message {
  return {
    id: `m${i}`,
    sessionId: "s1",
    parentId: i > 0 ? `m${i - 1}` : null,
    role: i % 2 === 0 ? "user" : "assistant",
    content: `This is message number ${i}. `.repeat(10),
    model: null,
    tokensIn: 0,
    tokensOut: 0,
    createdAt: Date.now(),
    isCompaction: false,
    ...overrides,
  };
}

function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => msg(i));
}

describe("shouldCompact", () => {
  it("returns false when message count is below threshold", () => {
    strictEqual(shouldCompact(makeMessages(5), 200_000), false);
  });

  it("returns true when estimated tokens exceed limit", () => {
    strictEqual(shouldCompact(makeMessages(100), 500), true);
  });

  it("returns false for empty messages", () => {
    strictEqual(shouldCompact([], 200_000), false);
  });

  it("returns true when messages are very long", () => {
    const msgs = Array.from({ length: 10 }, (_, i) =>
      msg(i, { content: "x".repeat(2_000) }),
    );
    strictEqual(shouldCompact(msgs, 1000), true);
  });
});

describe("compactMessages", () => {
  it("produces a compaction prompt from messages", () => {
    const prompt = compactMessages(makeMessages(10));
    ok(prompt.length > 0);
    ok(prompt.includes("message number"));
  });

  it("preserves the most recent messages (tail) in the prompt", () => {
    const prompt = compactMessages(makeMessages(20), 4);
    ok(prompt.includes("message number 19"));
    ok(prompt.includes("message number 18"));
  });

  it("separates messages to summarize from recent messages", () => {
    const prompt = compactMessages(makeMessages(10), 2);
    ok(prompt.includes("Summarize"));
    ok(prompt.includes("Recent messages"));
  });

  it("handles messages with null content gracefully", () => {
    const msgs = [
      msg(0, { content: null }),
      msg(1, { content: "hello" }),
    ];
    const prompt = compactMessages(msgs);
    ok(prompt.length > 0);
  });

  it("includes role labels in the output", () => {
    const msgs = [
      msg(0, { role: "user", content: "what is 2+2?" }),
      msg(1, { role: "assistant", content: "4" }),
    ];
    const prompt = compactMessages(msgs);
    ok(prompt.includes("user"));
    ok(prompt.includes("assistant"));
  });

  it("skips existing compaction messages in summary", () => {
    const msgs = [
      msg(0, { role: "assistant", content: "Previous summary...", isCompaction: true }),
      msg(1, { role: "user", content: "new question" }),
      msg(2, { role: "assistant", content: "answer" }),
    ];
    const prompt = compactMessages(msgs, 1);
    ok(prompt.includes("Previous summary"));
    ok(prompt.includes("answer"));
  });

  it("uses default keepRecentCount of 6 when not specified", () => {
    const prompt = compactMessages(makeMessages(20));
    ok(prompt.includes("message number 19"));
    ok(prompt.includes("message number 14"));
  });
});
