import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { connectChatSse } from "./connect_chat_sse.ts";

describe("connectChatSse", () => {
  it("is a function", () => {
    ok(typeof connectChatSse === "function");
  });

  it("accepts two arguments (sessionId, callbacks)", () => {
    strictEqual(connectChatSse.length, 2);
  });
});
