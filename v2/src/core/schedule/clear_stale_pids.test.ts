import { strictEqual } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { clearStalePids } from "./clear_stale_pids.ts";
import { createSchedule } from "./create_schedule.ts";
import { getSchedule } from "./get_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("clearStalePids", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("returns 0 when no schedules have running_pid", () => {
    createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    strictEqual(clearStalePids(db), 0);
  });

  it("clears a dead PID and records failure", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = 2147483647 WHERE id = ?").run(s.id);

    const cleared = clearStalePids(db);
    strictEqual(cleared, 1);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, null);
    strictEqual(updated.lastExitCode, -1);
    strictEqual(updated.failCount, 1);
  });

  it("preserves a live PID (self)", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = ? WHERE id = ?").run(process.pid, s.id);

    const cleared = clearStalePids(db);
    strictEqual(cleared, 0);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, process.pid);
  });
});
