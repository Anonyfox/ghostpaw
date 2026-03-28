import assert from "node:assert";
import { describe, it } from "node:test";
import { addMessage } from "../chat/messages.ts";
import { createSession } from "../chat/session.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { filterContextForSubsystem } from "./context_filter.ts";

describe("filterContextForSubsystem", () => {
  it("returns empty for empty session", () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");
    const rows = filterContextForSubsystem(db, session.id, "scribe", 3);
    assert.strictEqual(rows.length, 0);
    db.close();
  });

  it("includes user and organic assistant messages", () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");

    addMessage(db, session.id, "user", "hello");
    addMessage(db, session.id, "assistant", "hi there");

    const rows = filterContextForSubsystem(db, session.id, "scribe", 10);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].role, "user");
    assert.strictEqual(rows[1].role, "assistant");
    db.close();
  });

  it("includes own synthetic tool results and strips other subsystems", () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");

    addMessage(db, session.id, "user", "hello");

    const synthMsgId = addMessage(db, session.id, "assistant", "", { source: "synthetic" });
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "ic_scribe_1",
      synthMsgId,
      "subsystem_scribe",
      "{}",
    );
    db.prepare("INSERT INTO tool_calls (id, message_id, name, arguments) VALUES (?, ?, ?, ?)").run(
      "ic_other_1",
      synthMsgId,
      "subsystem_other",
      "{}",
    );

    addMessage(db, session.id, "tool", "[scribe] Test result", {
      source: "synthetic",
      toolCallId: "ic_scribe_1",
    });
    addMessage(db, session.id, "tool", "[other] Test result", {
      source: "synthetic",
      toolCallId: "ic_other_1",
    });

    const rows = filterContextForSubsystem(db, session.id, "scribe", 10);

    const userMsgs = rows.filter((r) => r.role === "user");
    assert.strictEqual(userMsgs.length, 1);

    const toolMsgs = rows.filter((r) => r.role === "tool");
    assert.strictEqual(toolMsgs.length, 1);
    assert.ok(toolMsgs[0].content.includes("[scribe]"));

    db.close();
  });

  it("respects lookback limit", () => {
    const db = openMemoryDatabase();
    const session = createSession(db, "m", "p");

    for (let i = 0; i < 5; i++) {
      addMessage(db, session.id, "user", `msg-${i}`);
      addMessage(db, session.id, "assistant", `reply-${i}`);
    }

    const rows = filterContextForSubsystem(db, session.id, "scribe", 2);
    const userMsgs = rows.filter((r) => r.role === "user");
    assert.strictEqual(userMsgs.length, 2);
    assert.strictEqual(userMsgs[0].content, "msg-3");
    assert.strictEqual(userMsgs[1].content, "msg-4");

    db.close();
  });
});
