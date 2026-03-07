import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { completeRun } from "./complete_run.ts";
import { createSchedule } from "./create_schedule.ts";
import { getSchedule } from "./get_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("completeRun", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("clears running_pid and records success", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = 9999 WHERE id = ?").run(s.id);

    completeRun(db, s.id, 0);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, null);
    strictEqual(updated.lastExitCode, 0);
    strictEqual(updated.lastError, null);
    strictEqual(updated.runCount, 1);
    strictEqual(updated.failCount, 0);
  });

  it("increments fail_count on non-zero exit", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = 9999 WHERE id = ?").run(s.id);

    completeRun(db, s.id, 1, "something broke");

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.lastExitCode, 1);
    strictEqual(updated.lastError, "something broke");
    strictEqual(updated.runCount, 1);
    strictEqual(updated.failCount, 1);
  });

  it("accumulates counters across multiple runs", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    completeRun(db, s.id, 0);
    completeRun(db, s.id, 1, "err");
    completeRun(db, s.id, 0);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runCount, 3);
    strictEqual(updated.failCount, 1);
  });
});
