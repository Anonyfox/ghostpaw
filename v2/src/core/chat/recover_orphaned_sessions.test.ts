import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { closeSession } from "./close_session.ts";
import { createSession } from "./create_session.ts";
import { getSession } from "./get_session.ts";
import { recoverOrphanedSessions } from "./recover_orphaned_sessions.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("recoverOrphanedSessions", () => {
  it("closes open delegate sessions whose parent is closed", () => {
    const parent = createSession(db, "parent", { purpose: "chat" });
    const child = createSession(db, "child", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    closeSession(db, parent.id as number);

    const recovered = recoverOrphanedSessions(db);
    strictEqual(recovered, 1);

    const updated = getSession(db, child.id as number)!;
    ok(updated.closedAt !== null);
    ok(updated.error!.includes("interrupted"));
  });

  it("leaves open delegate sessions whose parent is still open", () => {
    const parent = createSession(db, "parent", { purpose: "chat" });
    createSession(db, "child", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });

    const recovered = recoverOrphanedSessions(db);
    strictEqual(recovered, 0);
  });

  it("leaves already-closed delegate sessions untouched", () => {
    const parent = createSession(db, "parent", { purpose: "chat" });
    const child = createSession(db, "child", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    closeSession(db, child.id as number);
    closeSession(db, parent.id as number);

    const closedAt = getSession(db, child.id as number)!.closedAt;
    const recovered = recoverOrphanedSessions(db);
    strictEqual(recovered, 0);
    strictEqual(getSession(db, child.id as number)!.closedAt, closedAt);
  });

  it("does not touch non-delegate sessions", () => {
    const parent = createSession(db, "parent", { purpose: "chat" });
    createSession(db, "haunt", {
      purpose: "haunt",
      parentSessionId: parent.id as number,
    });
    closeSession(db, parent.id as number);

    const recovered = recoverOrphanedSessions(db);
    strictEqual(recovered, 0);
  });

  it("returns zero when no orphaned sessions exist", () => {
    strictEqual(recoverOrphanedSessions(db), 0);
  });

  it("recovers multiple orphaned sessions atomically", () => {
    const parent = createSession(db, "parent", { purpose: "chat" });
    createSession(db, "c1", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    createSession(db, "c2", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    createSession(db, "c3", {
      purpose: "delegate",
      parentSessionId: parent.id as number,
    });
    closeSession(db, parent.id as number);

    const recovered = recoverOrphanedSessions(db);
    strictEqual(recovered, 3);

    const remaining = db
      .prepare(
        "SELECT count(*) as c FROM sessions WHERE purpose = 'delegate' AND closed_at IS NULL",
      )
      .get() as { c: number };
    strictEqual(remaining.c, 0);
  });
});
