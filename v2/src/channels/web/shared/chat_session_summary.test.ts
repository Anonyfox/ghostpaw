import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChatSessionSummary } from "./chat_session_summary.ts";

describe("ChatSessionSummary", () => {
  it("accepts a summary with all fields", () => {
    const summary: ChatSessionSummary = {
      sessionId: 1,
      displayName: "My chat",
      model: "claude-sonnet-4-6",
      totalTokens: 1200,
      lastActiveAt: Date.now(),
      channel: "web",
    };
    strictEqual(summary.sessionId, 1);
    strictEqual(summary.channel, "web");
  });

  it("accepts null model", () => {
    const summary: ChatSessionSummary = {
      sessionId: 2,
      displayName: "CLI session",
      model: null,
      totalTokens: 0,
      lastActiveAt: Date.now(),
      channel: "cli",
    };
    strictEqual(summary.model, null);
  });
});
