import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { addMessage } from "./messages.ts";
import { reconstructMessages } from "./reconstruct.ts";
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

describe("reconstructMessages", () => {
  it("returns empty array for empty session", () => {
    const msgs = reconstructMessages(db, sessionId);
    assert.strictEqual(msgs.length, 0);
  });

  it("reconstructs user and assistant messages", () => {
    addMessage(db, sessionId, "user", "hello");
    addMessage(db, sessionId, "assistant", "hi there");

    const msgs = reconstructMessages(db, sessionId);
    assert.strictEqual(msgs.length, 2);
    assert.strictEqual(msgs[0].role, "user");
    assert.strictEqual(msgs[0].content, "hello");
    assert.strictEqual(msgs[1].role, "assistant");
    assert.strictEqual(msgs[1].content, "hi there");
  });

  it("reconstructs tool result messages with toolCallId", () => {
    addMessage(db, sessionId, "user", "do a thing");

    const assistantId = addMessage(db, sessionId, "assistant", "");
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "call_abc",
      assistantId,
      "read",
      '{"path":"/tmp/test"}',
    );

    addMessage(db, sessionId, "tool", "file contents here", { toolCallId: "call_abc" });
    addMessage(db, sessionId, "assistant", "I read the file.");

    const msgs = reconstructMessages(db, sessionId);
    assert.strictEqual(msgs.length, 4);

    assert.strictEqual(msgs[0].role, "user");

    assert.strictEqual(msgs[1].role, "assistant");
    assert.ok(msgs[1].toolCalls);
    assert.strictEqual(msgs[1].toolCalls!.length, 1);
    assert.strictEqual(msgs[1].toolCalls![0].id, "call_abc");
    assert.strictEqual(msgs[1].toolCalls![0].name, "read");
    assert.strictEqual(msgs[1].toolCalls![0].arguments, '{"path":"/tmp/test"}');

    assert.strictEqual(msgs[2].role, "tool");
    assert.strictEqual(msgs[2].content, "file contents here");
    assert.strictEqual(msgs[2].toolCallId, "call_abc");

    assert.strictEqual(msgs[3].role, "assistant");
    assert.strictEqual(msgs[3].content, "I read the file.");
    assert.ok(!msgs[3].toolCalls || msgs[3].toolCalls.length === 0);
  });

  it("reconstructs multi-tool-call scenarios", () => {
    addMessage(db, sessionId, "user", "read two files");

    const assistantId = addMessage(db, sessionId, "assistant", "");
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "call_1",
      assistantId,
      "read",
      '{"path":"/a"}',
    );
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "call_2",
      assistantId,
      "read",
      '{"path":"/b"}',
    );

    addMessage(db, sessionId, "tool", "contents of a", { toolCallId: "call_1" });
    addMessage(db, sessionId, "tool", "contents of b", { toolCallId: "call_2" });
    addMessage(db, sessionId, "assistant", "I read both files.");

    const msgs = reconstructMessages(db, sessionId);
    assert.strictEqual(msgs.length, 5);

    assert.strictEqual(msgs[1].toolCalls!.length, 2);
    assert.strictEqual(msgs[1].toolCalls![0].id, "call_1");
    assert.strictEqual(msgs[1].toolCalls![1].id, "call_2");

    assert.strictEqual(msgs[2].role, "tool");
    assert.strictEqual(msgs[2].toolCallId, "call_1");
    assert.strictEqual(msgs[3].role, "tool");
    assert.strictEqual(msgs[3].toolCallId, "call_2");
  });

  it("handles multiple tool iterations", () => {
    addMessage(db, sessionId, "user", "do the thing");

    // First iteration: assistant calls tool
    const a1 = addMessage(db, sessionId, "assistant", "");
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "call_iter1",
      a1,
      "bash",
      '{"command":"ls"}',
    );
    addMessage(db, sessionId, "tool", "file1 file2", { toolCallId: "call_iter1" });

    // Second iteration: assistant calls another tool
    const a2 = addMessage(db, sessionId, "assistant", "");
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "call_iter2",
      a2,
      "read",
      '{"path":"file1"}',
    );
    addMessage(db, sessionId, "tool", "content of file1", { toolCallId: "call_iter2" });

    // Final assistant response
    addMessage(db, sessionId, "assistant", "Done. file1 contains stuff.");

    const msgs = reconstructMessages(db, sessionId);
    assert.strictEqual(msgs.length, 6);

    assert.strictEqual(msgs[1].role, "assistant");
    assert.strictEqual(msgs[1].toolCalls!.length, 1);
    assert.strictEqual(msgs[1].toolCalls![0].name, "bash");

    assert.strictEqual(msgs[2].role, "tool");

    assert.strictEqual(msgs[3].role, "assistant");
    assert.strictEqual(msgs[3].toolCalls!.length, 1);
    assert.strictEqual(msgs[3].toolCalls![0].name, "read");

    assert.strictEqual(msgs[4].role, "tool");

    assert.strictEqual(msgs[5].role, "assistant");
    assert.strictEqual(msgs[5].content, "Done. file1 contains stuff.");
  });
});
