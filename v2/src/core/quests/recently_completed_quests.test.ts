import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { recentlyCompletedQuests } from "./recently_completed_quests.ts";
import { initQuestTables } from "./schema.ts";

describe("recentlyCompletedQuests", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initQuestTables(db);
  });

  it("returns quests completed after the given timestamp", () => {
    const now = Date.now();
    const recent = now - 1000;
    const old = now - 5 * 24 * 60 * 60 * 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, completed_at) VALUES (?, 'done', ?, 'human', ?, ?)",
    ).run("recently done", recent, recent, recent);
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, completed_at) VALUES (?, 'done', ?, 'human', ?, ?)",
    ).run("old done", old, old, old);

    const since = now - 2 * 24 * 60 * 60 * 1000;
    const result = recentlyCompletedQuests(db, since);
    strictEqual(result.length, 1);
    strictEqual(result[0].title, "recently done");
  });

  it("returns empty when nothing completed recently", () => {
    const result = recentlyCompletedQuests(db, Date.now());
    strictEqual(result.length, 0);
  });
});
