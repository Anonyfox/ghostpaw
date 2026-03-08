import { strictEqual, throws } from "node:assert";
import { beforeEach, describe, it } from "node:test";
import type { DatabaseHandle } from "../../lib/index.ts";
import { openTestDatabase } from "../../lib/index.ts";
import { createSchedule } from "./create_schedule.ts";
import { initScheduleTables } from "./schema.ts";

let db: DatabaseHandle;

describe("createSchedule", () => {
  beforeEach(async () => {
    db = await openTestDatabase();
    initScheduleTables(db);
  });

  it("creates a schedule and returns it", () => {
    const s = createSchedule(db, {
      name: "test-job",
      type: "custom",
      command: "echo hello",
      intervalMs: 300_000,
    });
    strictEqual(s.name, "test-job");
    strictEqual(s.type, "custom");
    strictEqual(s.command, "echo hello");
    strictEqual(s.intervalMs, 300_000);
    strictEqual(s.enabled, true);
    strictEqual(s.runCount, 0);
    strictEqual(s.failCount, 0);
    strictEqual(s.runningPid, null);
  });

  it("defaults enabled to true", () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
    });
    strictEqual(s.enabled, true);
  });

  it("respects enabled=false", () => {
    const s = createSchedule(db, {
      name: "a",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
      enabled: false,
    });
    strictEqual(s.enabled, false);
  });

  it("rejects empty name", () => {
    throws(
      () => createSchedule(db, { name: "  ", type: "custom", command: "ls", intervalMs: 60_000 }),
      /name must not be empty/,
    );
  });

  it("rejects empty command", () => {
    throws(
      () => createSchedule(db, { name: "x", type: "custom", command: "  ", intervalMs: 60_000 }),
      /command must not be empty/,
    );
  });

  it("rejects interval below 60s", () => {
    throws(
      () => createSchedule(db, { name: "x", type: "custom", command: "ls", intervalMs: 59_999 }),
      /at least 60000ms/,
    );
  });

  it("rejects duplicate names", () => {
    createSchedule(db, { name: "dup", type: "custom", command: "ls", intervalMs: 60_000 });
    throws(() =>
      createSchedule(db, { name: "dup", type: "custom", command: "ls", intervalMs: 60_000 }),
    );
  });

  it("stores timeout_ms when provided", () => {
    const s = createSchedule(db, {
      name: "timed",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
      timeoutMs: 300_000,
    });
    strictEqual(s.timeoutMs, 300_000);
  });

  it("defaults timeout_ms to null", () => {
    const s = createSchedule(db, {
      name: "notimed",
      type: "custom",
      command: "ls",
      intervalMs: 60_000,
    });
    strictEqual(s.timeoutMs, null);
  });

  it("rejects timeout_ms <= 0", () => {
    throws(
      () =>
        createSchedule(db, {
          name: "bad",
          type: "custom",
          command: "ls",
          intervalMs: 60_000,
          timeoutMs: 0,
        }),
      /timeout must be a positive/,
    );
    throws(
      () =>
        createSchedule(db, {
          name: "bad2",
          type: "custom",
          command: "ls",
          intervalMs: 60_000,
          timeoutMs: -1,
        }),
      /timeout must be a positive/,
    );
  });
});
