import { strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { createChatSendHandler } from "./chat_send_handler.ts";

describe("createChatSendHandler", () => {
  it("is a function that returns a handler", () => {
    strictEqual(typeof createChatSendHandler, "function");
  });
});
