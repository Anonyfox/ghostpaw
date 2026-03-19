import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initChatTables } from "./schema.ts";
import { sessionsSince } from "./sessions_since.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initChatTables(db);
});

describe("sessionsSince", () => {
  it("returns empty when no sessions exist", () => {
    strictEqual(sessionsSince(db, 0).length, 0);
  });

  it("filters by last_active_at", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at) VALUES (?, ?, ?, ?)",
    ).run("s1", "user", now - 100_000, now - 100_000);
    db.prepare(
      "INSERT INTO sessions (key, purpose, created_at, last_active_at) VALUES (?, ?, ?, ?)",
    ).run("s2", "user", now, now);
    const results = sessionsSince(db, now - 50_000);
    strictEqual(results.length, 1);
    strictEqual(results[0].key, "s2");
  });
});
