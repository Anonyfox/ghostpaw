import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import { type DatabaseHandle, openTestDatabase } from "../../lib/index.ts";
import { initSkillEventsTables } from "./runtime/events.ts";
import { skillEventsSince } from "./skill_events_since.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initSkillEventsTables(db);
});

describe("skillEventsSince", () => {
  it("returns empty when no events exist", () => {
    strictEqual(skillEventsSince(db, 0).length, 0);
  });

  it("converts ms to seconds for the query", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    db.prepare("INSERT INTO skill_events (skill, event, ts) VALUES (?, ?, ?)").run(
      "test-skill",
      "created",
      nowSec,
    );
    db.prepare("INSERT INTO skill_events (skill, event, ts) VALUES (?, ?, ?)").run(
      "test-skill",
      "old-event",
      nowSec - 200,
    );
    const results = skillEventsSince(db, (nowSec - 50) * 1000);
    strictEqual(results.length, 1);
    strictEqual(results[0].event, "created");
  });
});
