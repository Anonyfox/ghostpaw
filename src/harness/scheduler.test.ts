import { ok, strictEqual } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getSchedule, listSchedules } from "../core/schedule/api/read/index.ts";
import { createSchedule } from "../core/schedule/api/write/index.ts";
import { initScheduleTables } from "../core/schedule/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { openTestDatabase } from "../lib/index.ts";
import type { SchedulerHandle } from "./scheduler.ts";
import { startScheduler } from "./scheduler.ts";

const FAST_TICK = 10;

function poll(fn: () => boolean, intervalMs = 20, limitMs = 3_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const id = setInterval(() => {
      if (fn()) {
        clearInterval(id);
        resolve();
      } else if (Date.now() - start > limitMs) {
        clearInterval(id);
        reject(new Error(`poll timed out after ${limitMs}ms`));
      }
    }, intervalMs);
  });
}

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
    scheduler = startScheduler(db, ".", { tickMs: FAST_TICK });
    ok(typeof scheduler.stop === "function");
  });

  it("stop resolves when no children are running", async () => {
    scheduler = startScheduler(db, ".", { tickMs: FAST_TICK });
    await scheduler.stop();
    scheduler = null;
  });

  it("does not crash when schedules table is empty", async () => {
    scheduler = startScheduler(db, ".", { tickMs: FAST_TICK });
    await new Promise((r) => setTimeout(r, 50));
    await scheduler.stop();
    scheduler = null;
  });

  it("spawns a due custom job and records success", async () => {
    createSchedule(db, {
      name: "test-echo",
      type: "custom",
      command: "echo hello",
      intervalMs: 60_000,
    });
    db.prepare("UPDATE schedules SET next_run_at = 0 WHERE name = 'test-echo'").run();

    scheduler = startScheduler(db, ".", { tickMs: FAST_TICK });

    await poll(() => {
      const s = getSchedule(db, 1);
      return s !== null && s !== undefined && s.runCount >= 1;
    });

    const s = getSchedule(db, 1)!;
    ok(s.runCount >= 1, `expected runCount >= 1, got ${s.runCount}`);
    strictEqual(s.lastExitCode, 0);
    strictEqual(s.runningPid, null);

    await scheduler.stop();
    scheduler = null;
  });

  it("does not spawn disabled schedules", async () => {
    createSchedule(db, {
      name: "test-enabled",
      type: "custom",
      command: "echo enabled",
      intervalMs: 60_000,
    });
    createSchedule(db, {
      name: "test-disabled",
      type: "custom",
      command: "echo disabled",
      intervalMs: 60_000,
      enabled: false,
    });
    db.prepare("UPDATE schedules SET next_run_at = 0").run();

    scheduler = startScheduler(db, ".", { tickMs: FAST_TICK });

    await poll(() => {
      const enabled = listSchedules(db).find((s) => s.name === "test-enabled");
      return enabled !== undefined && enabled.runCount >= 1;
    });

    const disabled = listSchedules(db).find((s) => s.name === "test-disabled")!;
    strictEqual(disabled.runCount, 0);

    await scheduler.stop();
    scheduler = null;
  });
});
