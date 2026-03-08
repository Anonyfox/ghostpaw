import { ok, strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { claimSchedule } from "./claim_schedule.ts";
import { createSchedule } from "./create_schedule.ts";
import { getSchedule } from "./get_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("claimSchedule", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("claims a due schedule and sets running_pid and started_at", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    const nextRun = s.nextRunAt + s.intervalMs;
    const before = Date.now();
    const claimed = claimSchedule(db, s.id, s.nextRunAt, nextRun, 9999);
    strictEqual(claimed, true);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, 9999);
    strictEqual(updated.nextRunAt, nextRun);
    ok(updated.startedAt !== null);
    ok(updated.startedAt! >= before);
  });

  it("fails if next_run_at was already advanced (CAS)", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    const staleNextRun = s.nextRunAt - 1;
    const claimed = claimSchedule(db, s.id, staleNextRun, s.nextRunAt + 60_000, 9999);
    strictEqual(claimed, false);
  });

  it("fails if schedule is disabled", () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
      enabled: false,
    });
    db.prepare("UPDATE schedules SET next_run_at = 0 WHERE id = ?").run(s.id);
    const claimed = claimSchedule(db, s.id, 0, 60_000, 9999);
    strictEqual(claimed, false);
  });

  it("fails if running_pid is already set", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = 1111 WHERE id = ?").run(s.id);
    const claimed = claimSchedule(db, s.id, s.nextRunAt, s.nextRunAt + 60_000, 9999);
    strictEqual(claimed, false);
  });
});
