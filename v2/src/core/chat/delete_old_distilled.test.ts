import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initRunsTable } from "../runs/index.ts";
import { deleteOldDistilled } from "./delete_old_distilled.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
  initRunsTable(db);
});

afterEach(() => {
  db.close();
});

const DAY_MS = 86_400_000;
const TTL_MS = 30 * DAY_MS;

function insertSession(opts: {
  distilledAt?: number | null;
  closedAt?: number | null;
  createdAt?: number;
}): number {
  const now = Date.now();
  const created = opts.createdAt ?? now;
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, distilled_at, closed_at)
     VALUES (?, 'chat', ?, ?, ?, ?)`,
  ).run(`test:${Math.random()}`, created, created, opts.distilledAt ?? null, opts.closedAt ?? null);
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

function insertMessage(sessionId: number): number {
  db.prepare(
    `INSERT INTO messages (session_id, role, content, created_at)
     VALUES (?, 'user', 'hello', ?)`,
  ).run(sessionId, Date.now());
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

function insertRun(parentSessionId: number, childSessionId?: number): number {
  db.prepare(
    `INSERT INTO delegation_runs (parent_session_id, child_session_id, model, task, created_at)
     VALUES (?, ?, 'test', 'task', ?)`,
  ).run(parentSessionId, childSessionId ?? null, Date.now());
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number };
  return row.id;
}

function countSessions(): number {
  return (db.prepare("SELECT COUNT(*) AS cnt FROM sessions").get() as { cnt: number }).cnt;
}

function countMessages(): number {
  return (db.prepare("SELECT COUNT(*) AS cnt FROM messages").get() as { cnt: number }).cnt;
}

function countRuns(): number {
  return (db.prepare("SELECT COUNT(*) AS cnt FROM delegation_runs").get() as { cnt: number }).cnt;
}

describe("deleteOldDistilled", () => {
  it("returns zero when no sessions exist", () => {
    strictEqual(deleteOldDistilled(db), 0);
  });

  it("deletes sessions distilled longer ago than the TTL", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    insertSession({ distilledAt: oldTime, closedAt: oldTime });
    strictEqual(deleteOldDistilled(db), 1);
    strictEqual(countSessions(), 0);
  });

  it("keeps recently distilled sessions", () => {
    insertSession({ distilledAt: Date.now() - 1000, closedAt: Date.now() - 2000 });
    strictEqual(deleteOldDistilled(db), 0);
    strictEqual(countSessions(), 1);
  });

  it("does not touch undistilled sessions", () => {
    insertSession({ distilledAt: null });
    strictEqual(deleteOldDistilled(db), 0);
    strictEqual(countSessions(), 1);
  });

  it("cascades to messages", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    const sid = insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertMessage(sid);
    insertMessage(sid);
    strictEqual(countMessages(), 2);
    deleteOldDistilled(db);
    strictEqual(countMessages(), 0);
  });

  it("cascades to delegation_runs (parent reference)", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    const sid = insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertRun(sid);
    strictEqual(countRuns(), 1);
    deleteOldDistilled(db);
    strictEqual(countRuns(), 0);
  });

  it("cascades to delegation_runs (child reference)", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    const parentSid = insertSession({ distilledAt: null });
    const childSid = insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertRun(parentSid, childSid);
    strictEqual(countRuns(), 1);
    deleteOldDistilled(db);
    strictEqual(countRuns(), 0);
    strictEqual(countSessions(), 1);
  });

  it("does not delete messages from other sessions", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    const oldSid = insertSession({ distilledAt: oldTime, closedAt: oldTime });
    const keepSid = insertSession({ distilledAt: null });
    insertMessage(oldSid);
    insertMessage(keepSid);
    deleteOldDistilled(db);
    strictEqual(countMessages(), 1);
  });

  it("handles multiple sessions in one batch", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertSession({ distilledAt: oldTime - 1000, closedAt: oldTime });
    insertSession({ distilledAt: null });
    strictEqual(deleteOldDistilled(db), 2);
    strictEqual(countSessions(), 1);
  });

  it("accepts a custom TTL", () => {
    const fiveMinAgo = Date.now() - 300_000;
    insertSession({ distilledAt: fiveMinAgo, closedAt: fiveMinAgo });
    strictEqual(deleteOldDistilled(db, 60_000), 1);
  });

  it("returns correct count", () => {
    const oldTime = Date.now() - TTL_MS - 1000;
    insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertSession({ distilledAt: oldTime, closedAt: oldTime });
    insertSession({ distilledAt: Date.now(), closedAt: Date.now() });
    strictEqual(deleteOldDistilled(db), 2);
  });
});
