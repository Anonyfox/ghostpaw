import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { addMessage, deleteFromOrdinal, getMessages, nextOrdinal } from "./messages.ts";
import { createSession } from "./session.ts";

let db: DatabaseHandle;
let sessionId: number;

beforeEach(() => {
  db = openMemoryDatabase();
  sessionId = createSession(db, "model", "prompt").id;
});

afterEach(() => {
  db.close();
});

describe("nextOrdinal", () => {
  it("starts at 0 for empty session", () => {
    assert.strictEqual(nextOrdinal(db, sessionId), 0);
  });

  it("increments after adding messages", () => {
    addMessage(db, sessionId, "user", "hello");
    assert.strictEqual(nextOrdinal(db, sessionId), 1);

    addMessage(db, sessionId, "assistant", "hi");
    assert.strictEqual(nextOrdinal(db, sessionId), 2);
  });
});

describe("addMessage", () => {
  it("inserts a user message and returns the row id", () => {
    const id = addMessage(db, sessionId, "user", "hello");
    assert.strictEqual(typeof id, "number");
    assert.ok(id > 0);
  });

  it("stores optional extra fields", () => {
    const id = addMessage(db, sessionId, "assistant", "response", {
      model: "test-model",
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.01,
    });
    const rows = getMessages(db, sessionId);
    const msg = rows.find((r) => r.id === id);
    assert.ok(msg);
    assert.strictEqual(msg.model, "test-model");
    assert.strictEqual(msg.input_tokens, 100);
    assert.strictEqual(msg.output_tokens, 50);
    assert.strictEqual(msg.cost_usd, 0.01);
  });

  it("stores tool_call_id for tool role", () => {
    const id = addMessage(db, sessionId, "tool", "tool result", { toolCallId: "call_123" });
    const rows = getMessages(db, sessionId);
    const msg = rows.find((r) => r.id === id);
    assert.ok(msg);
    assert.strictEqual(msg.tool_call_id, "call_123");
    assert.strictEqual(msg.role, "tool");
  });
});

describe("getMessages", () => {
  it("returns messages sorted by ordinal", () => {
    addMessage(db, sessionId, "user", "first");
    addMessage(db, sessionId, "assistant", "second");
    addMessage(db, sessionId, "user", "third");

    const msgs = getMessages(db, sessionId);
    assert.strictEqual(msgs.length, 3);
    assert.strictEqual(msgs[0].content, "first");
    assert.strictEqual(msgs[1].content, "second");
    assert.strictEqual(msgs[2].content, "third");
    assert.ok(msgs[0].ordinal < msgs[1].ordinal);
    assert.ok(msgs[1].ordinal < msgs[2].ordinal);
  });

  it("returns empty array for empty session", () => {
    assert.deepStrictEqual(getMessages(db, sessionId), []);
  });
});

describe("deleteFromOrdinal", () => {
  it("deletes messages from the given ordinal", () => {
    addMessage(db, sessionId, "user", "keep");
    addMessage(db, sessionId, "assistant", "remove1");
    addMessage(db, sessionId, "user", "remove2");

    const removed = deleteFromOrdinal(db, sessionId, 1);
    assert.strictEqual(removed, 2);

    const remaining = getMessages(db, sessionId);
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].content, "keep");
  });

  it("returns 0 when no messages match", () => {
    const removed = deleteFromOrdinal(db, sessionId, 99);
    assert.strictEqual(removed, 0);
  });
});
