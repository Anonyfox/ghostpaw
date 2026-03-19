import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, closeSession, createSession } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { getExistingTuiSession, loadTuiMessages } from "./session_state.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getExistingTuiSession", () => {
  it("returns the latest open tui chat session", () => {
    const older = createSession(db, "tui:1", { purpose: "chat" });
    closeSession(db, older.id);
    const newer = createSession(db, "tui:2", { purpose: "chat" });

    const session = getExistingTuiSession(db);
    strictEqual(session?.id, newer.id);
  });
});

describe("loadTuiMessages", () => {
  it("loads only user and assistant messages for transcript replay", () => {
    const session = createSession(db, "tui:1", { purpose: "chat" });
    const user = addMessage(db, { sessionId: session.id, role: "user", content: "hello" });
    const toolCall = addMessage(db, {
      sessionId: session.id,
      role: "tool_call",
      content: "",
      toolData: "{}",
      parentId: user.id,
    });
    const toolResult = addMessage(db, {
      sessionId: session.id,
      role: "tool_result",
      content: "ok",
      toolData: "{}",
      parentId: toolCall.id,
    });
    addMessage(db, {
      sessionId: session.id,
      role: "assistant",
      content: "hi",
      parentId: toolResult.id,
    });

    deepStrictEqual(loadTuiMessages(db, session.id), [
      { id: 1, role: "user", content: "hello" },
      { id: 4, role: "assistant", content: "hi" },
    ]);
  });
});
