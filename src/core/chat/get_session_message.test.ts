import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { getSessionMessage } from "./get_session_message.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getSessionMessage", () => {
  it("returns null for missing session", () => {
    strictEqual(getSessionMessage(db, 999, "user", "first"), null);
  });

  it("returns null for session with no messages", () => {
    const s = createSession(db, "k");
    strictEqual(getSessionMessage(db, s.id, "user", "first"), null);
  });

  it("returns first user message", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "first question" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "answer" });
    addMessage(db, { sessionId: s.id, role: "user", content: "second question" });

    strictEqual(getSessionMessage(db, s.id, "user", "first"), "first question");
  });

  it("returns last user message", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "first question" });
    addMessage(db, { sessionId: s.id, role: "user", content: "second question" });

    strictEqual(getSessionMessage(db, s.id, "user", "last"), "second question");
  });

  it("returns last assistant message", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "hi" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "first reply" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "second reply" });

    strictEqual(getSessionMessage(db, s.id, "assistant", "last"), "second reply");
  });

  it("returns null when no messages match the role", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "hi" });

    strictEqual(getSessionMessage(db, s.id, "assistant", "first"), null);
  });
});
