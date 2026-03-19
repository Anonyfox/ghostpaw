import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { countSubstantiveMessages } from "./count_substantive_messages.ts";
import { createSession } from "./create_session.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("countSubstantiveMessages", () => {
  it("returns 0 for missing session", () => {
    strictEqual(countSubstantiveMessages(db, 999), 0);
  });

  it("returns 0 for session with no messages", () => {
    const s = createSession(db, "k");
    strictEqual(countSubstantiveMessages(db, s.id), 0);
  });

  it("counts user and assistant messages", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "hi" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "hello" });
    addMessage(db, { sessionId: s.id, role: "user", content: "bye" });

    strictEqual(countSubstantiveMessages(db, s.id), 3);
  });

  it("excludes tool_call and tool_result messages", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "hi" });
    addMessage(db, { sessionId: s.id, role: "tool_call", content: "{}" });
    addMessage(db, { sessionId: s.id, role: "tool_result", content: "ok" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "done" });

    strictEqual(countSubstantiveMessages(db, s.id), 2);
  });

  it("excludes compaction messages", () => {
    const s = createSession(db, "k");
    addMessage(db, { sessionId: s.id, role: "user", content: "hi" });
    addMessage(db, { sessionId: s.id, role: "assistant", content: "summary", isCompaction: true });

    strictEqual(countSubstantiveMessages(db, s.id), 1);
  });
});
