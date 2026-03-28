import assert from "node:assert";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { getMessages } from "./messages.ts";
import { createSession } from "./session.ts";

/** Used by the patched `stream` implementation below. */
let streamThrows = false;

function patchChatStream(): void {
  mock.method(Chat.prototype, "stream", function stream(this: Chat) {
    const self = this;
    async function* gen() {
      if (streamThrows) {
        throw new Error("LLM unavailable");
      }
      yield "x";
      self.addMessage(new Message("assistant", "Mock reply"));
      const internals = self as unknown as {
        _lastResult: {
          model: string;
          usage: Record<string, number>;
          cost: { estimatedUsd: number };
          iterations: number;
          content: string;
        } | null;
      };
      internals._lastResult = {
        model: self.model,
        usage: {
          inputTokens: 2,
          outputTokens: 4,
          reasoningTokens: 0,
          cachedTokens: 0,
          totalTokens: 6,
        },
        cost: { estimatedUsd: 0.001 },
        iterations: 1,
        content: "Mock reply",
      };
    }
    return gen();
  });
}

patchChatStream();
const { executeTurn } = await import("./turn.ts");

let db: DatabaseHandle;
let sessionId: number;

beforeEach(() => {
  streamThrows = false;
  patchChatStream();
  db = openMemoryDatabase();
  sessionId = createSession(db, "test-model", "You are a test assistant.").id;
});

afterEach(() => {
  db.close();
  mock.restoreAll();
});

describe("executeTurn", () => {
  it("persists user and assistant messages when the stream completes", async () => {
    const result = await executeTurn(db, [], sessionId, "Hello");

    assert.strictEqual(result.succeeded, true);
    assert.strictEqual(result.content, "Mock reply");
    assert.strictEqual(result.model, "test-model");

    const rows = getMessages(db, sessionId);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].role, "user");
    assert.strictEqual(rows[0].content, "Hello");
    assert.strictEqual(rows[1].role, "assistant");
    assert.strictEqual(rows[1].content, "Mock reply");
  });

  it("returns failure and does not persist assistant output when stream throws", async () => {
    streamThrows = true;

    const result = await executeTurn(db, [], sessionId, "Ping");

    assert.strictEqual(result.succeeded, false);
    assert.match(result.content, /LLM unavailable/);

    const rows = getMessages(db, sessionId);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].role, "user");
    assert.strictEqual(rows[0].content, "Ping");
  });

  it("returns failure when the session does not exist", async () => {
    const result = await executeTurn(db, [], 999_999, "Hi");

    assert.strictEqual(result.succeeded, false);
    assert.strictEqual(result.content, "Session not found");
    assert.strictEqual(getMessages(db, 999_999).length, 0);
  });
});
