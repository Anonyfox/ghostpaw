import { ok, strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeQuest } from "./complete_quest.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import type { Quest, QuestOccurrence } from "./types.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("completeQuest", () => {
  it("marks an accepted quest as done", () => {
    const q = createQuest(db, { title: "Test" });
    const result = completeQuest(db, q.id) as Quest;
    strictEqual(result.status, "done");
    ok(result.completedAt! > 0);
  });

  it("marks an active quest as done", () => {
    const q = createQuest(db, { title: "Test" });
    db.prepare("UPDATE quests SET status = 'active' WHERE id = ?").run(q.id);
    const result = completeQuest(db, q.id) as Quest;
    strictEqual(result.status, "done");
  });

  it("throws for already-terminal quest", () => {
    const q = createQuest(db, { title: "Test" });
    completeQuest(db, q.id);
    throws(() => completeQuest(db, q.id), /already in terminal/);
  });

  it("throws for nonexistent quest", () => {
    throws(() => completeQuest(db, 999), /not found/);
  });

  it("records occurrence for recurring quest", () => {
    const now = Date.now();
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    const occ = completeQuest(db, q.id, now) as QuestOccurrence;
    strictEqual(occ.questId, q.id);
    strictEqual(occ.occurrenceAt, now);
    strictEqual(occ.status, "done");
    ok(occ.completedAt > 0);
  });

  it("rejects occurrence_at on non-recurring quest", () => {
    const q = createQuest(db, { title: "One-off" });
    throws(() => completeQuest(db, q.id, Date.now()), /not recurring/);
  });

  it("rejects duplicate occurrence completion", () => {
    const now = Date.now();
    const q = createQuest(db, { title: "Daily", rrule: "FREQ=DAILY" });
    completeQuest(db, q.id, now);
    throws(() => completeQuest(db, q.id, now));
  });
});
