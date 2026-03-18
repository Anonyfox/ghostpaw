import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChatMessageInfo } from "./chat_message_info.ts";

describe("ChatMessageInfo", () => {
  it("accepts a user message", () => {
    const msg: ChatMessageInfo = {
      id: 1,
      role: "user",
      content: "Hello",
      createdAt: Date.now(),
      replyToId: null,
    };
    strictEqual(msg.role, "user");
  });

  it("accepts an assistant message", () => {
    const msg: ChatMessageInfo = {
      id: 2,
      role: "assistant",
      content: "Hi there!",
      createdAt: Date.now(),
      replyToId: null,
    };
    strictEqual(msg.role, "assistant");
  });
});
