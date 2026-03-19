import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { listDistillableSessionIds } from "./list_distillable_session_ids.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("listDistillableSessionIds", () => {
  it("returns empty array on empty database", () => {
    deepStrictEqual(listDistillableSessionIds(db), []);
  });

  it("returns closed sessions with messages that are not distilled", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s.id);

    const ids = listDistillableSessionIds(db);
    deepStrictEqual(ids, [s.id]);
  });

  it("excludes already distilled sessions", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    db.prepare("UPDATE sessions SET closed_at = ?, distilled_at = ? WHERE id = ?").run(
      Date.now(),
      Date.now(),
      s.id,
    );

    deepStrictEqual(listDistillableSessionIds(db), []);
  });

  it("excludes sessions without messages (head_message_id IS NULL)", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s.id);

    deepStrictEqual(listDistillableSessionIds(db), []);
  });

  it("includes stale open sessions past threshold", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    const staleTime = Date.now() - 2 * 86_400_000;
    db.prepare("UPDATE sessions SET last_active_at = ? WHERE id = ?").run(staleTime, s.id);

    const ids = listDistillableSessionIds(db);
    deepStrictEqual(ids, [s.id]);
  });

  it("excludes non-eligible purposes", () => {
    const s = createSession(db, "k1", { purpose: "system" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s.id);

    deepStrictEqual(listDistillableSessionIds(db), []);
  });

  it("respects maxSessions limit", () => {
    for (let i = 0; i < 5; i++) {
      const s = createSession(db, `k${i}`, { purpose: "chat" });
      addMessage(db, { sessionId: s.id, role: "user", content: `msg${i}` });
      db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s.id);
    }

    const ids = listDistillableSessionIds(db, { maxSessions: 2 });
    strictEqual(ids.length, 2);
  });

  it("accepts custom eligiblePurposes", () => {
    const s = createSession(db, "k1", { purpose: "system" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s.id);

    deepStrictEqual(listDistillableSessionIds(db, { eligiblePurposes: ["system"] }), [s.id]);
  });

  it("excludes sessions with a recent distill failure", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    db.prepare("UPDATE sessions SET closed_at = ?, distill_failed_at = ? WHERE id = ?").run(
      Date.now(),
      Date.now(),
      s.id,
    );

    deepStrictEqual(listDistillableSessionIds(db), []);
  });

  it("includes sessions whose distill failure is older than 24h (retry)", () => {
    const s = createSession(db, "k1", { purpose: "chat" });
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });
    const oldFailure = Date.now() - 2 * 86_400_000;
    db.prepare("UPDATE sessions SET closed_at = ?, distill_failed_at = ? WHERE id = ?").run(
      Date.now(),
      oldFailure,
      s.id,
    );

    deepStrictEqual(listDistillableSessionIds(db), [s.id]);
  });
});
