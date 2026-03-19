import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/open_test_database.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { getHistory } from "./get_history.ts";
import { persistToolMessages } from "./persist_tool_messages.ts";
import { initChatTables } from "./schema.ts";

describe("persistToolMessages", () => {
  let db: DatabaseHandle;
  let sessionId: number;

  beforeEach(async () => {
    db = await openTestDatabase();
    initChatTables(db);
    const session = createSession(db, "test:persist");
    sessionId = session.id;
    addMessage(db, { sessionId, role: "user", content: "Hello" });
  });

  it("returns parentId unchanged when no tool messages exist", () => {
    const result = persistToolMessages(db, sessionId, [], 1);
    assert.strictEqual(result, 1);
  });

  it("persists a tool_call message from an assistant with toolCalls", () => {
    const toolCallMsg = Message.assistantToolCall([
      { id: "call_1", name: "read_file", arguments: '{"path":"/foo.ts"}' },
    ]);

    const head = getHistory(db, sessionId).at(-1)!.id;
    const newHead = persistToolMessages(db, sessionId, [toolCallMsg], head);

    assert.notStrictEqual(newHead, head);
    const history = getHistory(db, sessionId);
    const toolCall = history.find((m) => m.role === "tool_call");
    assert.ok(toolCall);
    assert.strictEqual(toolCall.content, "");
    assert.ok(toolCall.toolData);
    const parsed = JSON.parse(toolCall.toolData);
    assert.strictEqual(parsed.kind, "tool_call");
    assert.strictEqual(parsed.calls[0].name, "read_file");
    assert.strictEqual(parsed.calls[0].id, "call_1");
  });

  it("persists a tool_result message", () => {
    const toolResultMsg = Message.tool("file contents here", "call_1");

    const head = getHistory(db, sessionId).at(-1)!.id;
    const newHead = persistToolMessages(db, sessionId, [toolResultMsg], head);

    assert.notStrictEqual(newHead, head);
    const history = getHistory(db, sessionId);
    const toolResult = history.find((m) => m.role === "tool_result");
    assert.ok(toolResult);
    assert.strictEqual(toolResult.content, "file contents here");
    assert.ok(toolResult.toolData);
    const parsed = JSON.parse(toolResult.toolData);
    assert.strictEqual(parsed.kind, "tool_result");
    assert.strictEqual(parsed.toolCallId, "call_1");
    assert.strictEqual(parsed.success, null);
  });

  it("chains multiple tool messages with correct parent_ids", () => {
    const messages = [
      Message.assistantToolCall([{ id: "call_1", name: "read", arguments: "{}" }]),
      Message.tool("result_1", "call_1"),
      Message.assistantToolCall([{ id: "call_2", name: "write", arguments: "{}" }]),
      Message.tool("result_2", "call_2"),
    ];

    const head = getHistory(db, sessionId).at(-1)!.id;
    persistToolMessages(db, sessionId, messages, head);

    const history = getHistory(db, sessionId);
    const toolMsgs = history.filter((m) => m.role === "tool_call" || m.role === "tool_result");
    assert.strictEqual(toolMsgs.length, 4);
    assert.strictEqual(toolMsgs[0].role, "tool_call");
    assert.strictEqual(toolMsgs[1].role, "tool_result");
    assert.strictEqual(toolMsgs[2].role, "tool_call");
    assert.strictEqual(toolMsgs[3].role, "tool_result");

    assert.strictEqual(toolMsgs[0].parentId, head);
    assert.strictEqual(toolMsgs[1].parentId, toolMsgs[0].id);
    assert.strictEqual(toolMsgs[2].parentId, toolMsgs[1].id);
    assert.strictEqual(toolMsgs[3].parentId, toolMsgs[2].id);
  });

  it("skips plain assistant messages without toolCalls", () => {
    const messages = [Message.assistant("Just text, no tools")];
    const head = getHistory(db, sessionId).at(-1)!.id;
    const newHead = persistToolMessages(db, sessionId, messages, head);
    assert.strictEqual(newHead, head);
  });

  it("handles null parentId", () => {
    const toolCallMsg = Message.assistantToolCall([{ id: "call_1", name: "ls", arguments: "{}" }]);

    const newHead = persistToolMessages(db, sessionId, [toolCallMsg], null);
    assert.ok(typeof newHead === "number");
  });
});
