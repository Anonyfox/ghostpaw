import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { addMessage, getMessages } from "./messages.ts";
import { persistTurnMessages } from "./persist_turn.ts";
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

describe("persistTurnMessages", () => {
  it("persists a simple assistant response", () => {
    addMessage(db, sessionId, "user", "hello");

    const newMsgs = [new Message("assistant", "hi there")];
    const lastId = persistTurnMessages(db, sessionId, newMsgs);
    assert.ok(lastId > 0);

    const allMsgs = getMessages(db, sessionId);
    assert.strictEqual(allMsgs.length, 2);
    assert.strictEqual(allMsgs[1].role, "assistant");
    assert.strictEqual(allMsgs[1].content, "hi there");
  });

  it("persists usage data on the last assistant message", () => {
    addMessage(db, sessionId, "user", "hello");

    const newMsgs = [new Message("assistant", "hi")];
    persistTurnMessages(db, sessionId, newMsgs, {
      model: "claude-test",
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.005,
    });

    const allMsgs = getMessages(db, sessionId);
    const last = allMsgs[allMsgs.length - 1];
    assert.strictEqual(last.model, "claude-test");
    assert.strictEqual(last.input_tokens, 100);
    assert.strictEqual(last.output_tokens, 50);
    assert.strictEqual(last.cost_usd, 0.005);
  });

  it("persists tool calls attached to assistant messages", () => {
    addMessage(db, sessionId, "user", "list files");

    const assistantMsg = new Message("assistant", "", {
      toolCalls: [{ id: "call_1", name: "ls", arguments: '{"path":"."}' }],
    });
    const toolResultMsg = new Message("tool", "file1\nfile2", { toolCallId: "call_1" });
    const finalMsg = new Message("assistant", "Here are the files.");

    persistTurnMessages(db, sessionId, [assistantMsg, toolResultMsg, finalMsg], {
      model: "test",
      inputTokens: 200,
      outputTokens: 30,
    });

    const allMsgs = getMessages(db, sessionId);
    assert.strictEqual(allMsgs.length, 4);

    const toolCalls = db
      .prepare("SELECT * FROM tool_calls WHERE message_id = ?")
      .all(allMsgs[1].id);
    assert.strictEqual(toolCalls.length, 1);
    assert.strictEqual((toolCalls[0] as Record<string, unknown>).name, "ls");
    assert.strictEqual((toolCalls[0] as Record<string, unknown>).arguments, '{"path":"."}');

    assert.strictEqual(allMsgs[2].role, "tool");
    assert.strictEqual(allMsgs[2].tool_call_id, "call_1");
    assert.strictEqual(allMsgs[2].content, "file1\nfile2");

    // Usage only on last assistant message
    assert.strictEqual(allMsgs[3].model, "test");
    assert.strictEqual(allMsgs[3].input_tokens, 200);
    assert.strictEqual(allMsgs[1].model, null);
  });

  it("handles multi-tool-call messages", () => {
    addMessage(db, sessionId, "user", "read two files");

    const assistantMsg = new Message("assistant", "", {
      toolCalls: [
        { id: "call_a", name: "read", arguments: '{"path":"/a"}' },
        { id: "call_b", name: "read", arguments: '{"path":"/b"}' },
      ],
    });
    const toolA = new Message("tool", "content a", { toolCallId: "call_a" });
    const toolB = new Message("tool", "content b", { toolCallId: "call_b" });
    const finalMsg = new Message("assistant", "Got both files.");

    persistTurnMessages(db, sessionId, [assistantMsg, toolA, toolB, finalMsg]);

    const allMsgs = getMessages(db, sessionId);
    assert.strictEqual(allMsgs.length, 5);

    const toolCalls = db
      .prepare("SELECT * FROM tool_calls WHERE message_id = ?")
      .all(allMsgs[1].id);
    assert.strictEqual(toolCalls.length, 2);
  });

  it("rolls back on error", () => {
    addMessage(db, sessionId, "user", "hello");

    const _badMsg = {
      role: "assistant",
      content: "test",
      toolCallId: undefined,
      toolCalls: undefined,
    } as unknown as Message;

    try {
      // Force a unique constraint violation by inserting with a duplicate ordinal
      db.prepare(
        `INSERT INTO messages (session_id, ordinal, role, content) VALUES (?, ?, ?, ?)`,
      ).run(sessionId, 1, "assistant", "occupying slot");

      persistTurnMessages(db, sessionId, [new Message("assistant", "test")]);
      // The ordinal 1 is already taken — this should cause a UNIQUE constraint error
      assert.fail("Should have thrown");
    } catch {
      // Expected — transaction rolled back
    }

    // Verify the original occupying message is still there
    const msgs = getMessages(db, sessionId);
    const occupying = msgs.find((m) => m.content === "occupying slot");
    assert.ok(occupying);
  });

  it("updates session updated_at", () => {
    const before = createSession(db, "m", "p");
    const beforeTime = before.updated_at;

    addMessage(db, before.id, "user", "hello");
    persistTurnMessages(db, before.id, [new Message("assistant", "hi")]);

    const after = db.prepare("SELECT updated_at FROM sessions WHERE id = ?").get(before.id) as {
      updated_at: string;
    };
    assert.ok(after.updated_at >= beforeTime);
  });
});

describe("persist + reconstruct round-trip", () => {
  it("simple text round-trips perfectly", () => {
    addMessage(db, sessionId, "user", "hello");

    const newMsgs = [new Message("assistant", "hi there")];
    persistTurnMessages(db, sessionId, newMsgs);

    const reconstructed = reconstructMessages(db, sessionId);
    assert.strictEqual(reconstructed.length, 2);
    assert.strictEqual(reconstructed[0].role, "user");
    assert.strictEqual(reconstructed[0].content, "hello");
    assert.strictEqual(reconstructed[1].role, "assistant");
    assert.strictEqual(reconstructed[1].content, "hi there");
  });

  it("tool-call round-trips perfectly", () => {
    addMessage(db, sessionId, "user", "check the file");

    const turn = [
      new Message("assistant", "", {
        toolCalls: [{ id: "call_xyz", name: "read", arguments: '{"path":"/etc/hosts"}' }],
      }),
      new Message("tool", "127.0.0.1 localhost", { toolCallId: "call_xyz" }),
      new Message("assistant", "The hosts file maps localhost."),
    ];

    persistTurnMessages(db, sessionId, turn);

    const reconstructed = reconstructMessages(db, sessionId);
    assert.strictEqual(reconstructed.length, 4);

    assert.strictEqual(reconstructed[1].role, "assistant");
    assert.ok(reconstructed[1].toolCalls);
    assert.strictEqual(reconstructed[1].toolCalls![0].id, "call_xyz");
    assert.strictEqual(reconstructed[1].toolCalls![0].name, "read");
    assert.strictEqual(reconstructed[1].toolCalls![0].arguments, '{"path":"/etc/hosts"}');

    assert.strictEqual(reconstructed[2].role, "tool");
    assert.strictEqual(reconstructed[2].content, "127.0.0.1 localhost");
    assert.strictEqual(reconstructed[2].toolCallId, "call_xyz");

    assert.strictEqual(reconstructed[3].content, "The hosts file maps localhost.");
  });

  it("multi-tool multi-iteration round-trips perfectly", () => {
    addMessage(db, sessionId, "user", "complex task");

    const turn = [
      // Iteration 1: two parallel tool calls
      new Message("assistant", "", {
        toolCalls: [
          { id: "c1", name: "ls", arguments: '{"path":"."}' },
          { id: "c2", name: "datetime", arguments: "{}" },
        ],
      }),
      new Message("tool", "file1 file2", { toolCallId: "c1" }),
      new Message("tool", "2025-01-01T00:00:00Z", { toolCallId: "c2" }),

      // Iteration 2: one more tool call
      new Message("assistant", "Found files, checking one...", {
        toolCalls: [{ id: "c3", name: "read", arguments: '{"path":"file1"}' }],
      }),
      new Message("tool", "content of file1", { toolCallId: "c3" }),

      // Final response
      new Message("assistant", "All done."),
    ];

    persistTurnMessages(db, sessionId, turn);

    const reconstructed = reconstructMessages(db, sessionId);
    assert.strictEqual(reconstructed.length, 7);

    // First assistant: 2 tool calls
    assert.strictEqual(reconstructed[1].toolCalls!.length, 2);
    assert.strictEqual(reconstructed[1].toolCalls![0].id, "c1");
    assert.strictEqual(reconstructed[1].toolCalls![1].id, "c2");

    // Two tool results
    assert.strictEqual(reconstructed[2].role, "tool");
    assert.strictEqual(reconstructed[2].toolCallId, "c1");
    assert.strictEqual(reconstructed[3].role, "tool");
    assert.strictEqual(reconstructed[3].toolCallId, "c2");

    // Second assistant: 1 tool call
    assert.strictEqual(reconstructed[4].toolCalls!.length, 1);
    assert.strictEqual(reconstructed[4].toolCalls![0].id, "c3");
    assert.strictEqual(reconstructed[4].content, "Found files, checking one...");

    // Tool result
    assert.strictEqual(reconstructed[5].role, "tool");
    assert.strictEqual(reconstructed[5].toolCallId, "c3");

    // Final
    assert.strictEqual(reconstructed[6].content, "All done.");
    assert.ok(!reconstructed[6].toolCalls || reconstructed[6].toolCalls.length === 0);
  });
});
