import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { createStoryline } from "./create_storyline.ts";
import { embarkEligible } from "./embark_eligible.ts";
import { initQuestTables } from "./schema.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("embarkEligible", () => {
  it("returns empty when no ghostpaw quests", () => {
    createQuest(db, { title: "Human quest" });
    strictEqual(embarkEligible(db).length, 0);
  });

  it("returns ghostpaw-created accepted/active quests", () => {
    createQuest(db, { title: "GP quest", createdBy: "ghostpaw" });
    const results = embarkEligible(db);
    strictEqual(results.length, 1);
    strictEqual(results[0].title, "GP quest");
  });

  it("excludes terminal statuses", () => {
    const q = createQuest(db, { title: "Done", createdBy: "ghostpaw" });
    updateQuest(db, q.id, { status: "done" });
    strictEqual(embarkEligible(db).length, 0);
  });

  it("excludes recurring quests", () => {
    createQuest(db, {
      title: "Daily",
      createdBy: "ghostpaw",
      rrule: "FREQ=DAILY",
    });
    strictEqual(embarkEligible(db).length, 0);
  });

  it("prioritizes active over accepted", () => {
    createQuest(db, { title: "Accepted", createdBy: "ghostpaw" });
    const q = createQuest(db, { title: "Active", createdBy: "ghostpaw" });
    updateQuest(db, q.id, { status: "active" });
    const results = embarkEligible(db);
    strictEqual(results[0].title, "Active");
  });

  it("prioritizes overdue deadline", () => {
    const now = Date.now();
    createQuest(db, { title: "No deadline", createdBy: "ghostpaw" });
    createQuest(db, {
      title: "Overdue",
      createdBy: "ghostpaw",
      dueAt: now - 86_400_000,
    });
    const results = embarkEligible(db);
    strictEqual(results[0].title, "Overdue");
  });

  it("respects limit", () => {
    for (let i = 0; i < 10; i++) {
      createQuest(db, { title: `Q${i}`, createdBy: "ghostpaw" });
    }
    strictEqual(embarkEligible(db, 3).length, 3);
  });

  it("excludes quest when earlier storyline quest is not terminal", () => {
    const s = createStoryline(db, { title: "Ordered" });
    createQuest(db, {
      title: "Step 1",
      createdBy: "ghostpaw",
      storylineId: s.id,
    });
    createQuest(db, {
      title: "Step 2",
      createdBy: "ghostpaw",
      storylineId: s.id,
    });
    const results = embarkEligible(db);
    strictEqual(results.length, 1);
    strictEqual(results[0].title, "Step 1");
  });

  it("includes quest when earlier storyline quest is done", () => {
    const s = createStoryline(db, { title: "Ordered" });
    const q1 = createQuest(db, {
      title: "Step 1",
      createdBy: "ghostpaw",
      storylineId: s.id,
    });
    createQuest(db, {
      title: "Step 2",
      createdBy: "ghostpaw",
      storylineId: s.id,
    });
    updateQuest(db, q1.id, { status: "done" });
    const results = embarkEligible(db);
    strictEqual(results.length, 1);
    strictEqual(results[0].title, "Step 2");
  });

  it("uses storyline deadline when quest has no due_at", () => {
    const futureDeadline = Date.now() + 86_400_000;
    const s = createStoryline(db, { title: "Deadlined", dueAt: futureDeadline });
    createQuest(db, {
      title: "No own deadline",
      createdBy: "ghostpaw",
      storylineId: s.id,
    });
    createQuest(db, { title: "No deadline at all", createdBy: "ghostpaw" });
    const results = embarkEligible(db);
    strictEqual(results[0].title, "No own deadline");
  });
});
