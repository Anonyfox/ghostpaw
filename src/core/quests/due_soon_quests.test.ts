import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { dueSoonQuests } from "./due_soon_quests.ts";
import { initQuestTables } from "./schema.ts";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

describe("dueSoonQuests", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initQuestTables(db);
  });

  it("returns empty when no quests exist", () => {
    strictEqual(dueSoonQuests(db, THREE_DAYS_MS).length, 0);
  });

  it("returns quests due within the horizon", () => {
    const now = Date.now();
    const dueTomorrow = now + 24 * 60 * 60 * 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'active', ?, 'human', ?, ?)",
    ).run("due tomorrow", now, now, dueTomorrow);

    const result = dueSoonQuests(db, THREE_DAYS_MS);
    strictEqual(result.length, 1);
    strictEqual(result[0].title, "due tomorrow");
  });

  it("excludes quests already overdue", () => {
    const now = Date.now();
    const pastDue = now - 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'active', ?, 'human', ?, ?)",
    ).run("overdue", now, now, pastDue);

    strictEqual(dueSoonQuests(db, THREE_DAYS_MS).length, 0);
  });

  it("excludes quests due beyond the horizon", () => {
    const now = Date.now();
    const dueFarFuture = now + 30 * 24 * 60 * 60 * 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'active', ?, 'human', ?, ?)",
    ).run("far future", now, now, dueFarFuture);

    strictEqual(dueSoonQuests(db, THREE_DAYS_MS).length, 0);
  });

  it("excludes terminal statuses", () => {
    const now = Date.now();
    const dueSoon = now + 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at, due_at) VALUES (?, 'done', ?, 'human', ?, ?)",
    ).run("done quest", now, now, dueSoon);

    strictEqual(dueSoonQuests(db, THREE_DAYS_MS).length, 0);
  });
});
