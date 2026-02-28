import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChatSessionInfo } from "./chat_session_info.ts";

describe("ChatSessionInfo", () => {
  it("accepts a session with all fields", () => {
    const info: ChatSessionInfo = {
      sessionId: 1,
      model: "claude-sonnet-4-6",
      totalTokens: 500,
      createdAt: Date.now(),
      displayName: "Test chat",
    };
    strictEqual(info.sessionId, 1);
    strictEqual(info.displayName, "Test chat");
  });

  it("accepts null displayName", () => {
    const info: ChatSessionInfo = {
      sessionId: 2,
      model: "gpt-4o",
      totalTokens: 0,
      createdAt: Date.now(),
      displayName: null,
    };
    strictEqual(info.displayName, null);
  });
});
