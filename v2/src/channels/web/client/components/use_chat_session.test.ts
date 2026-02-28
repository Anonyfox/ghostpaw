import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { connectChatSse } from "./connect_chat_sse.ts";
import type { UseChatSessionResult } from "./use_chat_session.ts";
import { useChatSession } from "./use_chat_session.ts";

describe("useChatSession", () => {
  it("is a function", () => {
    ok(typeof useChatSession === "function");
  });

  it("accepts an optional options argument", () => {
    strictEqual(useChatSession.length, 1);
  });
});

describe("connectChatSse", () => {
  it("is a function", () => {
    ok(typeof connectChatSse === "function");
  });
});

describe("UseChatSessionResult type", () => {
  it("defines expected keys at type level", () => {
    const keys: (keyof UseChatSessionResult)[] = [
      "session",
      "messages",
      "streamingContent",
      "loading",
      "error",
      "totalTokens",
      "model",
      "sendMessage",
    ];
    strictEqual(keys.length, 8);
  });
});
