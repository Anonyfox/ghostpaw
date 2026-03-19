import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { initScheduleTables } from "./schema.ts";
import { updateSchedule } from "./update_schedule.ts";

let db: DatabaseHandle;

describe("updateSchedule", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("updates interval and recalculates next_run_at", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "echo hi",
      intervalMs: 120_000,
    });
    const updated = updateSchedule(db, s.id, { intervalMs: 300_000 });
    strictEqual(updated.intervalMs, 300_000);
    strictEqual(updated.nextRunAt > s.nextRunAt || updated.nextRunAt !== s.nextRunAt, true);
  });

  it("toggles enabled", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "echo hi",
      intervalMs: 120_000,
    });
    const updated = updateSchedule(db, s.id, { enabled: false });
    strictEqual(updated.enabled, false);
  });

  it("updates command for custom schedules", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "echo old",
      intervalMs: 120_000,
    });
    const updated = updateSchedule(db, s.id, { command: "echo new" });
    strictEqual(updated.command, "echo new");
  });

  it("rejects command change for builtin schedules", () => {
    const s = createSchedule(db, {
      name: "builtin-test",
      type: "builtin",
      command: "haunt",
      intervalMs: 120_000,
    });
    throws(() => updateSchedule(db, s.id, { command: "other" }), /builtin/);
  });

  it("rejects interval below 60s", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    throws(() => updateSchedule(db, s.id, { intervalMs: 10_000 }), /at least 60000ms/);
  });

  it("throws for unknown id", () => {
    throws(() => updateSchedule(db, 999, { enabled: false }), /not found/);
  });

  it("updates timeout_ms", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    const updated = updateSchedule(db, s.id, { timeoutMs: 600_000 });
    strictEqual(updated.timeoutMs, 600_000);
  });

  it("clears timeout_ms when set to null", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
      timeoutMs: 600_000,
    });
    const updated = updateSchedule(db, s.id, { timeoutMs: null });
    strictEqual(updated.timeoutMs, null);
  });

  it("rejects timeout_ms <= 0", () => {
    const s = createSchedule(db, {
      name: "test",
      type: "custom",
      command: "ls",
      intervalMs: 120_000,
    });
    throws(() => updateSchedule(db, s.id, { timeoutMs: 0 }), /timeout must be a positive/);
    throws(() => updateSchedule(db, s.id, { timeoutMs: -5 }), /timeout must be a positive/);
  });
});
