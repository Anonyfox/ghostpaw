import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  createSession,
  getSession,
  getSessionByKey,
  initChatTables,
} from "../../core/chat/index.ts";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import type { HandleResetDeps } from "./handle_reset.ts";
import { handleReset } from "./handle_reset.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

function createDeps(overrides?: Partial<HandleResetDeps>): HandleResetDeps & {
  sent: Array<{ chatId: number; text: string }>;
} {
  const sent: Array<{ chatId: number; text: string }> = [];
  return {
    db,
    isAllowed: () => true,
    sendMessage: async (chatId, text) => {
      sent.push({ chatId, text });
    },
    sent,
    ...overrides,
  };
}

describe("handleReset", () => {
  it("closes the active session and confirms to the user", async () => {
    const session = createSession(db, "telegram:42", { purpose: "chat" });
    const deps = createDeps();

    await handleReset(deps, 42);

    const closed = getSession(db, session.id);
    ok(closed?.closedAt, "session should be closed");
    strictEqual(deps.sent.length, 1);
    ok(deps.sent[0]!.text.includes("Session reset"));
    ok(deps.sent[0]!.text.includes("memories"));
  });

  it("informs user when no active session exists", async () => {
    const deps = createDeps();

    await handleReset(deps, 42);

    strictEqual(deps.sent.length, 1);
    ok(deps.sent[0]!.text.includes("No active session"));
  });

  it("next message after reset creates a fresh session", async () => {
    createSession(db, "telegram:42", { purpose: "chat" });
    const deps = createDeps();

    await handleReset(deps, 42);

    const oldSession = getSessionByKey(db, "telegram:42");
    strictEqual(oldSession, null, "no open session after reset");
  });

  it("silently ignores disallowed chats", async () => {
    createSession(db, "telegram:42", { purpose: "chat" });
    const deps = createDeps({ isAllowed: () => false });

    await handleReset(deps, 42);

    strictEqual(deps.sent.length, 0);
    const session = getSessionByKey(db, "telegram:42");
    ok(session, "session should NOT be closed for disallowed chat");
  });
});
