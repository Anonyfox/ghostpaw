import { ok, strictEqual } from "node:assert";
import { spawn } from "node:child_process";
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

  it("preserves a live PID (self) without timeout", () => {
    const s = createSchedule(db, { name: "a", type: "custom", command: "ls", intervalMs: 60_000 });
    db.prepare("UPDATE schedules SET running_pid = ?, started_at = ? WHERE id = ?").run(
      process.pid,
      Date.now(),
      s.id,
    );

    const cleared = clearStalePids(db);
    strictEqual(cleared, 0);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, process.pid);
  });

  it("kills a live PID that exceeded its timeout", () => {
    const child = spawn("sleep", ["60"], { stdio: "ignore", detached: false });
    const childPid = child.pid!;
    try {
      const s = createSchedule(db, {
        name: "slow",
        type: "custom",
        command: "ls",
        intervalMs: 60_000,
        timeoutMs: 1_000,
      });
      db.prepare("UPDATE schedules SET running_pid = ?, started_at = ? WHERE id = ?").run(
        childPid,
        Date.now() - 5_000,
        s.id,
      );

      const cleared = clearStalePids(db);
      strictEqual(cleared, 1);

      const updated = getSchedule(db, s.id)!;
      strictEqual(updated.runningPid, null);
      strictEqual(updated.startedAt, null);
      strictEqual(updated.failCount, 1);
      ok(updated.lastError?.includes("timed out"));
    } finally {
      try {
        child.kill("SIGKILL");
      } catch {
        // Already dead from the timeout kill.
      }
    }
  });

  it("preserves a live PID within timeout", () => {
    const s = createSchedule(db, {
      name: "fast",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
      timeoutMs: 600_000,
    });
    db.prepare("UPDATE schedules SET running_pid = ?, started_at = ? WHERE id = ?").run(
      process.pid,
      Date.now(),
      s.id,
    );

    const cleared = clearStalePids(db);
    strictEqual(cleared, 0);

    const updated = getSchedule(db, s.id)!;
    strictEqual(updated.runningPid, process.pid);
  });
});
