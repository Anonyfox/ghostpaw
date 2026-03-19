import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { initQuestTables } from "./schema.ts";
import { staleQuests } from "./stale_quests.ts";

describe("staleQuests", () => {
  let db: DatabaseHandle;

  beforeEach(async () => {
    db = await openTestDatabase();
    initQuestTables(db);
  });

  it("returns active quests not updated in 7+ days", () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'active', ?, 'human', ?)",
    ).run("stale quest", eightDaysAgo, eightDaysAgo);
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'active', ?, 'human', ?)",
    ).run("fresh quest", now, now);

    const result = staleQuests(db);
    strictEqual(result.length, 1);
    strictEqual(result[0].title, "stale quest");
  });

  it("excludes non-active quests", () => {
    const old = Date.now() - 10 * 24 * 60 * 60 * 1000;
    db.prepare(
      "INSERT INTO quests (title, status, created_at, created_by, updated_at) VALUES (?, 'done', ?, 'human', ?)",
    ).run("done quest", old, old);

    const result = staleQuests(db);
    strictEqual(result.length, 0);
  });

  it("returns empty when no quests exist", () => {
    const result = staleQuests(db);
    strictEqual(result.length, 0);
  });
});
