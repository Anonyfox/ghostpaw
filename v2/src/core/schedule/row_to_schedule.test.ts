import { deepStrictEqual, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { rowToSchedule } from "./row_to_schedule.ts";

describe("rowToSchedule", () => {
  it("maps a database row to a Schedule", () => {
    const row = {
      id: 1,
      name: "haunt",
      type: "builtin",
      command: "haunt",
      interval_ms: 1800000,
      enabled: 1,
      next_run_at: 5000,
      running_pid: null,
      last_run_at: 3000,
      last_exit_code: 0,
      last_error: null,
      run_count: 5,
      fail_count: 1,
      created_at: 1000,
      updated_at: 4000,
    };
    deepStrictEqual(rowToSchedule(row), {
      id: 1,
      name: "haunt",
      type: "builtin",
      command: "haunt",
      intervalMs: 1800000,
      enabled: true,
      nextRunAt: 5000,
      runningPid: null,
      lastRunAt: 3000,
      lastExitCode: 0,
      lastError: null,
      runCount: 5,
      failCount: 1,
      createdAt: 1000,
      updatedAt: 4000,
    });
  });

  it("maps enabled=0 to false", () => {
    const row = {
      id: 2,
      name: "distill",
      type: "builtin",
      command: "distill",
      interval_ms: 7200000,
      enabled: 0,
      next_run_at: 9000,
      running_pid: 12345,
      last_run_at: null,
      last_exit_code: null,
      last_error: null,
      run_count: 0,
      fail_count: 0,
      created_at: 1000,
      updated_at: 1000,
    };
    strictEqual(rowToSchedule(row).enabled, false);
    strictEqual(rowToSchedule(row).runningPid, 12345);
  });
});
