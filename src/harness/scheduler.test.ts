import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSchedule, listSchedules } from "../core/schedule/api/read/index.ts";
import { createSchedule } from "../core/schedule/api/write/index.ts";
import { ensureDefaultSchedules, initScheduleTables } from "../core/schedule/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import type { SchedulerHandle } from "./scheduler.ts";
import { startScheduler } from "./scheduler.ts";

let db: DatabaseHandle;
let scheduler: SchedulerHandle | null = null;

describe("startScheduler", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  afterEach(async () => {
    if (scheduler) {
      await scheduler.stop();
      scheduler = null;
    }
  });

  it("returns a handle with a stop method", () => {
    scheduler = startScheduler(db, ".");
    ok(typeof scheduler.stop === "function");
  });

  it("stop resolves when no children are running", async () => {
    scheduler = startScheduler(db, ".");
    await scheduler.stop();
    scheduler = null;
  });

  it("does not crash when schedules table is empty", async () => {
    scheduler = startScheduler(db, ".");
    await new Promise((r) => setTimeout(r, 100));
    await scheduler.stop();
    scheduler = null;
  });

  it("spawns a due builtin job", async () => {
    createSchedule(db, {
      name: "test-echo",
      type: "custom",
      command: "echo hello",
      intervalMs: 60_000,
    });
    db.prepare("UPDATE schedules SET next_run_at = 0 WHERE name = 'test-echo'").run();

    scheduler = startScheduler(db, ".");

    await new Promise((r) => setTimeout(r, 35_000));

    const s = getSchedule(db, 1)!;
    ok(s.runCount >= 1, `expected runCount >= 1, got ${s.runCount}`);
    strictEqual(s.lastExitCode, 0);
    strictEqual(s.runningPid, null);

    await scheduler.stop();
    scheduler = null;
  });

  it("does not spawn disabled schedules", async () => {
    ensureDefaultSchedules(db);
    db.prepare("UPDATE schedules SET enabled = 0 WHERE name = 'haunt'").run();
    db.prepare("UPDATE schedules SET next_run_at = 0").run();

    scheduler = startScheduler(db, ".");

    await new Promise((r) => setTimeout(r, 35_000));

    const haunt = listSchedules(db).find((s) => s.name === "haunt")!;
    strictEqual(haunt.runCount, 0);

    await scheduler.stop();
    scheduler = null;
  });
});
