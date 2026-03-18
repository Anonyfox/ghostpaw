import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { addMessage, createSession } from "../../core/chat/api/write/index.ts";
import { initChatTables } from "../../core/chat/runtime/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { executeUndo } from "./cmd_undo.ts";
import type { CommandContext } from "./types.ts";

let db: DatabaseHandle;
let sessionId: number;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  const session = createSession(db, "test:undo", { purpose: "chat" });
  sessionId = session.id as number;
});

afterEach(() => {
  db.close();
});

function makeCtx(): CommandContext {
  return { db, sessionId, sessionKey: "test:undo", configuredKeys: new Set() };
}

describe("executeUndo", () => {
  it("removes last exchange and returns undo action", async () => {
    addMessage(db, { sessionId, role: "user", content: "hi" });
    addMessage(db, { sessionId, role: "assistant", content: "hello" });

    const result = await executeUndo(makeCtx(), "");

    ok(result.action);
    strictEqual(result.action!.type, "undo");
    if (result.action!.type === "undo") {
      strictEqual(result.action.removedCount, 2);
    }
  });

  it("returns nothing to undo for empty session", async () => {
    const result = await executeUndo(makeCtx(), "");
    strictEqual(result.action, undefined);
    ok(result.text.includes("Nothing"));
  });

  it("returns nothing to undo when only user message exists", async () => {
    addMessage(db, { sessionId, role: "user", content: "hi" });

    const result = await executeUndo(makeCtx(), "");
    strictEqual(result.action, undefined);
    ok(result.text.includes("Nothing"));
  });
});
