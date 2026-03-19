import { strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { addMessage } from "./add_message.ts";
import { createSession } from "./create_session.ts";
import { pruneEmptySessions } from "./prune_empty_sessions.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("pruneEmptySessions", () => {
  it("returns 0 when no sessions exist", () => {
    strictEqual(pruneEmptySessions(db), 0);
  });

  it("prunes empty sessions older than threshold", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const s = createSession(db, "old");
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(twoHoursAgo, s.id);

    strictEqual(pruneEmptySessions(db), 1);
  });

  it("keeps recent empty sessions", () => {
    createSession(db, "fresh");
    strictEqual(pruneEmptySessions(db), 0);
  });

  it("keeps sessions that have messages", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const s = createSession(db, "with-msg");
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(twoHoursAgo, s.id);
    addMessage(db, { sessionId: s.id, role: "user", content: "hello" });

    strictEqual(pruneEmptySessions(db), 0);
  });

  it("keeps parent sessions with active delegations", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const parent = createSession(db, "parent");
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(twoHoursAgo, parent.id);
    createSession(db, "delegate:1", { purpose: "delegate", parentSessionId: parent.id });

    strictEqual(pruneEmptySessions(db), 0);
  });

  it("keeps open delegate sessions even if empty", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const parent = createSession(db, "parent");
    const child = createSession(db, "delegate:1", {
      purpose: "delegate",
      parentSessionId: parent.id,
    });
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(twoHoursAgo, child.id);

    strictEqual(pruneEmptySessions(db), 0);
  });

  it("respects custom olderThanMs", () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const s = createSession(db, "old");
    db.prepare("UPDATE sessions SET created_at = ? WHERE id = ?").run(fiveMinAgo, s.id);

    strictEqual(pruneEmptySessions(db, 60 * 1000), 1);
    strictEqual(pruneEmptySessions(db, 10 * 60 * 1000), 0);
  });
});
