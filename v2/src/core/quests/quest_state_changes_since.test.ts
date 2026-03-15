import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { questStateChangesSince } from "./quest_state_changes_since.ts";
import { initQuestTables } from "./schema.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("questStateChangesSince", () => {
  it("returns empty when no quests exist", () => {
    strictEqual(questStateChangesSince(db, 0).length, 0);
  });

  it("filters by updated_at", () => {
    const now = Date.now();
    db.prepare(
      "INSERT INTO quests (title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("Old quest", "d", "active", "normal", now - 200_000, now - 200_000);
    db.prepare(
      "INSERT INTO quests (title, description, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("New quest", "d", "active", "normal", now, now);
    const results = questStateChangesSince(db, now - 50_000);
    strictEqual(results.length, 1);
    strictEqual(results[0].title, "New quest");
  });
});
