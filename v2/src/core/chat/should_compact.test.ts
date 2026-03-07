import { strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { shouldCompact } from "./should_compact.ts";
import type { ChatMessage } from "./types.ts";

function msg(content: string): ChatMessage {
  return {
    id: 1,
    sessionId: 1,
    parentId: null,
    role: "user",
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

describe("shouldCompact", () => {
  it("returns false for empty history or below threshold", () => {
    strictEqual(shouldCompact([], 1000), false);
    strictEqual(shouldCompact([msg("short")], 1000), false);
  });

  it("returns true when estimated tokens exceed threshold", () => {
    strictEqual(shouldCompact([msg("a".repeat(5000))], 1000), true);
  });

  it("sums tokens across all messages", () => {
    const messages = [msg("a".repeat(400)), msg("b".repeat(400)), msg("c".repeat(400))];
    strictEqual(shouldCompact(messages, 200), true);
    strictEqual(shouldCompact(messages, 500), false);
  });

  it("returns false when threshold is zero or negative (disabled)", () => {
    strictEqual(shouldCompact([msg("a".repeat(10000))], 0), false);
    strictEqual(shouldCompact([msg("a".repeat(10000))], -1), false);
  });
});
