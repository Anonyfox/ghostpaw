import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { initChatTables } from "./schema.ts";
import { serializeToolCallData } from "./tool_trace.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("closeSession", () => {
  it("sets closed_at and optionally error", () => {
    const session = createSession(db, "k");
    const before = Date.now();
    closeSession(db, session.id);
    const found = getSession(db, session.id)!;
    ok(found.closedAt! >= before);
    strictEqual(found.error, null);

    const s2 = createSession(db, "k2");
    closeSession(db, s2.id, "something went wrong");
    strictEqual(getSession(db, s2.id)!.error, "something went wrong");
  });

  it("is idempotent — does not overwrite closed_at, error, or xpEarned", () => {
    const session = createSession(db, "k");
    closeSession(db, session.id, "first error");
    const first = getSession(db, session.id)!;
    closeSession(db, session.id, "second error");
    const second = getSession(db, session.id)!;
    strictEqual(first.closedAt, second.closedAt);
    strictEqual(second.error, "first error");
    strictEqual(first.xpEarned, second.xpEarned);
  });

  it("does nothing for a non-existent session", () => {
    closeSession(db, 99999);
    strictEqual(getSession(db, 99999), null);
  });

  it("computes xpEarned = 0 for session with no messages", () => {
    const session = createSession(db, "empty");
    closeSession(db, session.id);
    strictEqual(getSession(db, session.id)!.xpEarned, 0);
  });

  it("computes xpEarned > 0 for session with tokens and tool calls", () => {
    const session = createSession(db, "work");
    const sid = session.id as number;
    const fiveMinAgo = Date.now() - 300_000;

    db.prepare(
      "UPDATE sessions SET tokens_in = 10000, tokens_out = 5000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, sid);

    const toolData = serializeToolCallData([
      { id: "t1", name: "bash", arguments: "{}" },
      { id: "t2", name: "read_file", arguments: "{}" },
    ]);
    addMessage(db, { sessionId: sid, role: "tool_call", content: "", toolData });

    const toolData2 = serializeToolCallData([{ id: "t3", name: "write_file", arguments: "{}" }]);
    addMessage(db, { sessionId: sid, role: "tool_call", content: "", toolData: toolData2 });

    closeSession(db, sid);
    const closed = getSession(db, sid)!;
    ok(closed.xpEarned > 0, `expected xp > 0, got ${closed.xpEarned}`);
  });

  it("computes higher XP for more diverse tool usage", () => {
    const s1 = createSession(db, "narrow");
    const sid1 = s1.id as number;
    const fiveMinAgo = Date.now() - 300_000;
    db.prepare(
      "UPDATE sessions SET tokens_in = 10000, tokens_out = 5000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, sid1);
    addMessage(db, {
      sessionId: sid1,
      role: "tool_call",
      content: "",
      toolData: serializeToolCallData([{ id: "t1", name: "bash", arguments: "{}" }]),
    });
    closeSession(db, sid1);

    const s2 = createSession(db, "diverse");
    const sid2 = s2.id as number;
    db.prepare(
      "UPDATE sessions SET tokens_in = 10000, tokens_out = 5000, created_at = ? WHERE id = ?",
    ).run(fiveMinAgo, sid2);
    addMessage(db, {
      sessionId: sid2,
      role: "tool_call",
      content: "",
      toolData: serializeToolCallData([
        { id: "t1", name: "bash", arguments: "{}" },
        { id: "t2", name: "read_file", arguments: "{}" },
        { id: "t3", name: "write_file", arguments: "{}" },
        { id: "t4", name: "web_search", arguments: "{}" },
        { id: "t5", name: "memory_store", arguments: "{}" },
      ]),
    });
    closeSession(db, sid2);

    const xp1 = getSession(db, sid1)!.xpEarned;
    const xp2 = getSession(db, sid2)!.xpEarned;
    ok(xp2 > xp1, `diverse (${xp2}) should exceed narrow (${xp1})`);
  });
});
