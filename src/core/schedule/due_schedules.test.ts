import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { getDueSchedules } from "./due_schedules.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("getDueSchedules", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("returns schedules with next_run_at <= now", () => {
    createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    const farFuture = Date.now() + 999_999_999;
    strictEqual(getDueSchedules(db, farFuture).length, 1);
  });

  it("excludes schedules not yet due", () => {
    createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    strictEqual(getDueSchedules(db, 0).length, 0);
  });

  it("excludes disabled schedules", () => {
    createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
      enabled: false,
    });
    const farFuture = Date.now() + 999_999_999;
    strictEqual(getDueSchedules(db, farFuture).length, 0);
  });

  it("excludes schedules with a running_pid", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = 12345 WHERE id = ?").run(s.id);
    const farFuture = Date.now() + 999_999_999;
    strictEqual(getDueSchedules(db, farFuture).length, 0);
  });
});
