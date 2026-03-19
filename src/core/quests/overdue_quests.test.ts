import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { overdueQuests } from "./overdue_quests.ts";
import { initQuestTables } from "./schema.ts";

describe("overdueQuests", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initQuestTables(db);
  });

  it("returns empty when no quests exist", () => {
    strictEqual(overdueQuests(db).length, 0);
  });

  it("returns quests with due_at in the past", () => {
    const pastDue = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'active', ?, 'human', ?, ?)",
    ).run("overdue quest", now, now, pastDue);

    const result = overdueQuests(db);
    strictEqual(result.length, 1);
    strictEqual(result[0].title, "overdue quest");
  });

  it("excludes terminal and offered statuses", () => {
    const pastDue = Date.now() - 1000;
    const now = Date.now();
    for (const status of ["offered", "done", "failed", "abandoned"]) {
      db.prepare(
        "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, ?, ?, 'human', ?, ?)",
      ).run(`${status} quest`, status, now, now, pastDue);
    }

    strictEqual(overdueQuests(db).length, 0);
  });

  it("excludes quests with no due_at", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'active', ?, 'human', ?)",
    ).run("no deadline", now, now);

    strictEqual(overdueQuests(db).length, 0);
  });

  it("respects limit parameter", () => {
    const pastDue = Date.now() - 1000;
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      db.prepare(
        "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'active', ?, 'human', ?, ?)",
      ).run(`overdue ${i}`, now, now, pastDue - i * 1000);
    }

    strictEqual(overdueQuests(db, 2).length, 2);
  });
});
