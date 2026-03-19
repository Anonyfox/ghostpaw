import { strictEqual } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { deleteOldDistilled } from "./delete_old_distilled.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

const DAY_MS = 86_400_000;
const TTL_MS = 30 * DAY_MS;

function insertSession(opts: { distilledAt?: number | null; closedAt?: number | null }): number {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (key, purpose, created_at, last_active_at, distilled_at, closed_at)
     VALUES (?, 'chat', ?, ?, ?, ?)`,
  ).run(`test:${Math.random()}`, now, now, opts.distilledAt ?? null, opts.closedAt ?? null);
  return (db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id;
}

function insertMessage(sessionId: number) {
  db.prepare(
    "INSERT INTO messages (session_id, role, content, created_at) VALUES (?, 'user', 'hello', ?)",
  ).run(sessionId, Date.now());
}

describe("deleteOldDistilled", () => {
  it("deletes old distilled sessions and cascades to messages", () => {
    const old = Date.now() - TTL_MS - 1000;
    const oldSid = insertSession({ distilledAt: old, closedAt: old });
    const keepSid = insertSession({ distilledAt: null });
    insertMessage(oldSid);
    insertMessage(keepSid);
    strictEqual(deleteOldDistilled(db), 1);
    strictEqual((db.prepare("SELECT COUNT(*) AS c FROM sessions").get() as { c: number }).c, 1);
    strictEqual((db.prepare("SELECT COUNT(*) AS c FROM messages").get() as { c: number }).c, 1);
  });

  it("keeps recently distilled and undistilled sessions", () => {
    insertSession({ distilledAt: Date.now() - 1000, closedAt: Date.now() - 2000 });
    insertSession({ distilledAt: null });
    strictEqual(deleteOldDistilled(db), 0);
  });

  it("accepts a custom TTL", () => {
    insertSession({ distilledAt: Date.now() - 300_000, closedAt: Date.now() - 300_000 });
    strictEqual(deleteOldDistilled(db, 60_000), 1);
  });
});
