import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createQuest } from "./create_quest.ts";
import { initQuestTables } from "./schema.ts";
import { getTemporalContext } from "./temporal_context.ts";
import { updateQuest } from "./update_quest.ts";

let db: DatabaseHandle;

beforeEach(async () => {
  db = await openTestDatabase();
  initQuestTables(db);
});

describe("getTemporalContext", () => {
  it("returns empty context when no quests exist", () => {
    const ctx = getTemporalContext(db);
    strictEqual(ctx.overdue.length, 0);
    strictEqual(ctx.dueSoon.length, 0);
    strictEqual(ctx.todayEvents.length, 0);
    strictEqual(ctx.activeQuests.length, 0);
    strictEqual(ctx.pendingReminders.length, 0);
  });

  it("identifies overdue quests", () => {
    const past = Date.now() - 86400000;
    createQuest(db, { title: "Overdue", dueAt: past });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.overdue.length, 1);
    strictEqual(ctx.overdue[0].title, "Overdue");
  });

  it("excludes completed quests from overdue", () => {
    const past = Date.now() - 86400000;
    const q = createQuest(db, { title: "Done overdue", dueAt: past });
    updateQuest(db, q.id, { status: "done" });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.overdue.length, 0);
  });

  it("identifies due-soon quests", () => {
    const future = Date.now() + 3 * 24 * 60 * 60 * 1000;
    createQuest(db, { title: "Due in 3 days", dueAt: future });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.dueSoon.length, 1);
  });

  it("identifies active quests", () => {
    const q = createQuest(db, { title: "Active task" });
    updateQuest(db, q.id, { status: "active" });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.activeQuests.length, 1);
  });

  it("identifies pending reminders", () => {
    const past = Date.now() - 3600000;
    createQuest(db, { title: "Reminder", remindAt: past });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.pendingReminders.length, 1);
  });

  it("excludes already-reminded quests from pending reminders", () => {
    const past = Date.now() - 3600000;
    const q = createQuest(db, { title: "Reminded", remindAt: past });
    updateQuest(db, q.id, { remindedAt: Date.now() });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.pendingReminders.length, 0);
  });

  it("includes snoozed reminders (remind_at updated after reminded_at)", () => {
    const q = createQuest(db, { title: "Snoozed", remindAt: Date.now() - 7200000 });
    updateQuest(db, q.id, { remindedAt: Date.now() - 3600000 });
    updateQuest(db, q.id, { remindAt: Date.now() - 1000 });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.pendingReminders.length, 1);
    strictEqual(ctx.pendingReminders[0].title, "Snoozed");
  });

  it("identifies today's events", () => {
    const now = Date.now();
    const startOfDay = now - (now % 86400000);
    createQuest(db, { title: "Today event", startsAt: startOfDay + 36000000 });
    createQuest(db, {
      title: "Tomorrow event",
      startsAt: startOfDay + 86400000 + 36000000,
    });
    const ctx = getTemporalContext(db);
    strictEqual(ctx.todayEvents.length, 1);
    strictEqual(ctx.todayEvents[0].title, "Today event");
  });
});
