import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { countQuestsByStatus } from "./count_quests_by_status.ts";
import { initQuestTables } from "./schema.ts";

describe("countQuestsByStatus", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initQuestTables(db);
  });

  it("returns 0 when no quests exist", () => {
    strictEqual(countQuestsByStatus(db, "active"), 0);
  });

  it("counts quests with the given status", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'active', ?, 'human', ?)",
    ).run("a1", now, now);
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'active', ?, 'human', ?)",
    ).run("a2", now, now);
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'offered', ?, 'human', ?)",
    ).run("o1", now, now);

    strictEqual(countQuestsByStatus(db, "active"), 2);
    strictEqual(countQuestsByStatus(db, "offered"), 1);
    strictEqual(countQuestsByStatus(db, "done"), 0);
  });
});
