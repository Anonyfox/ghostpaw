import { deepStrictEqual, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSession } from "./create_session.ts";
import { getSessionStats } from "./get_session_stats.ts";
import { initChatTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

afterEach(() => {
  db.close();
});

describe("getSessionStats", () => {
  it("returns zeroes on empty database", () => {
    const stats = getSessionStats(db);
    strictEqual(stats.total, 0);
    strictEqual(stats.open, 0);
    strictEqual(stats.closed, 0);
    strictEqual(stats.distilled, 0);
    deepStrictEqual(stats.byChannel, {});
    deepStrictEqual(stats.byPurpose, {});
  });

  it("counts open, closed, and distilled sessions", () => {
    createSession(db, "web:1");
    const s2 = createSession(db, "web:2");
    db.prepare("UPDATE sessions SET closed_at = ? WHERE id = ?").run(Date.now(), s2.id);
    const s3 = createSession(db, "web:3");
    db.prepare("UPDATE sessions SET closed_at = ?, distilled_at = ? WHERE id = ?").run(
      Date.now(),
      Date.now(),
      s3.id,
    );

    const stats = getSessionStats(db);
    strictEqual(stats.total, 3);
    strictEqual(stats.open, 1);
    strictEqual(stats.closed, 1);
    strictEqual(stats.distilled, 1);
  });

  it("groups by channel from key prefix", () => {
    createSession(db, "web:a");
    createSession(db, "web:b");
    createSession(db, "telegram:c");

    const stats = getSessionStats(db);
    strictEqual(stats.byChannel.web, 2);
    strictEqual(stats.byChannel.telegram, 1);
  });

  it("groups by purpose", () => {
    createSession(db, "k1", { purpose: "chat" });
    createSession(db, "k2", { purpose: "delegate" });
    createSession(db, "k3", { purpose: "chat" });

    const stats = getSessionStats(db);
    strictEqual(stats.byPurpose.chat, 2);
    strictEqual(stats.byPurpose.delegate, 1);
  });
});
