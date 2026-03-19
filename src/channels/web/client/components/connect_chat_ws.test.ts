import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { connectChatWs } from "./connect_chat_ws.ts";

describe("connectChatWs", () => {
  it("is a function", () => {
    ok(typeof connectChatWs === "function");
  });

  it("accepts two arguments (sessionId, callbacks)", () => {
    strictEqual(connectChatWs.length, 2);
  });
});
