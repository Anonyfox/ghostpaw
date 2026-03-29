import assert from "node:assert";
import { describe, it } from "node:test";
import { openMemoryDatabase } from "../db/open.ts";
import { cap, completeRun } from "./complete.ts";

function insertRunningPulse(
  db: ReturnType<typeof openMemoryDatabase>,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    name: "t",
    type: "builtin",
    command: "heartbeat",
    interval_ms: 60000,
    cron_expr: null,
    timeout_ms: 60000,
    enabled: 1,
    next_run_at: "2099-01-01T00:00:00.000Z",
    running: 1,
    started_at: "2026-01-01T00:00:00.000Z",
  };
  const row = { ...defaults, ...overrides };
  db.prepare(
    `INSERT INTO pulses (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at, running, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.name,
    row.type,
    row.command,
    row.interval_ms,
    row.cron_expr,
    row.timeout_ms,
    row.enabled,
    row.next_run_at,
    row.running,
    row.started_at,
  );
  return Number(db.prepare("SELECT id FROM pulses WHERE name = ?").get(row.name)?.id ?? 0);
}

describe("cap", () => {
  it("returns undefined for undefined input", () => {
    assert.strictEqual(cap(undefined), undefined);
  });

  it("returns string unchanged when below max", () => {
    assert.strictEqual(cap("short", 100), "short");
  });

  it("returns string unchanged when exactly at max", () => {
    const s = "x".repeat(10);
    assert.strictEqual(cap(s, 10), s);
  });

  it("truncates string when above max", () => {
    const s = "x".repeat(3000);
    assert.strictEqual(cap(s, 10)?.length, 10);
  });
});

describe("completeRun", () => {
  it("resets running state and increments run_count", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    completeRun(db, id, { exitCode: 0, output: "ok" });
    const p = db
      .prepare(
        "SELECT running, running_pid, started_at, run_count, last_exit_code FROM pulses WHERE id = ?",
      )
      .get(id) as Record<string, unknown>;
    assert.strictEqual(p.running, 0);
    assert.strictEqual(p.running_pid, null);
    assert.strictEqual(p.started_at, null);
    assert.strictEqual(p.run_count, 1);
    assert.strictEqual(p.last_exit_code, 0);
  });

  it("sets last_run_at on completion", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    completeRun(db, id, { exitCode: 0 });
    const p = db.prepare("SELECT last_run_at FROM pulses WHERE id = ?").get(id) as {
      last_run_at: string | null;
    };
    assert.ok(p.last_run_at !== null);
    assert.ok(p.last_run_at.includes("T"));
  });

  it("inserts pulse_runs record with correct content", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    completeRun(db, id, { exitCode: 1, error: "boom", output: "partial" });
    const run = db.prepare("SELECT * FROM pulse_runs WHERE pulse_id = ?").get(id) as Record<
      string,
      unknown
    >;
    assert.strictEqual(run.pulse_name, "t");
    assert.strictEqual(run.exit_code, 1);
    assert.strictEqual(run.error, "boom");
    assert.strictEqual(run.output, "partial");
    assert.strictEqual(run.session_id, null);
    assert.ok(run.started_at !== null);
    assert.ok(run.finished_at !== null);
    assert.ok(typeof run.duration_ms === "number");
  });

  it("caps error and output in run record", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    const long = "x".repeat(5000);
    completeRun(db, id, { exitCode: 0, error: long, output: long });
    const run = db.prepare("SELECT error, output FROM pulse_runs WHERE pulse_id = ?").get(id) as {
      error: string;
      output: string;
    };
    assert.strictEqual(run.error.length, 2048);
    assert.strictEqual(run.output.length, 2048);
  });

  it("is idempotent when called twice", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    completeRun(db, id, { exitCode: 0 });
    completeRun(db, id, { exitCode: 0 });
    const p = db.prepare("SELECT run_count FROM pulses WHERE id = ?").get(id) as {
      run_count: number;
    };
    assert.strictEqual(p.run_count, 1);
    const runs = db.prepare("SELECT COUNT(*) as c FROM pulse_runs WHERE pulse_id = ?").get(id) as {
      c: number;
    };
    assert.strictEqual(runs.c, 1);
  });

  it("is a no-op for nonexistent pulse id", () => {
    const db = openMemoryDatabase();
    completeRun(db, 99999, { exitCode: 1 });
    const count = db.prepare("SELECT COUNT(*) as c FROM pulse_runs").get() as { c: number };
    assert.strictEqual(count.c, 0);
  });

  it("is a no-op for pulse not currently running", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db, { running: 0, started_at: null });
    completeRun(db, id, { exitCode: 1 });
    const p = db.prepare("SELECT run_count FROM pulses WHERE id = ?").get(id) as {
      run_count: number;
    };
    assert.strictEqual(p.run_count, 0);
  });

  it("auto-disables one-off pulses (no interval, no cron)", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db, {
      name: "once",
      type: "agent",
      command: "hi",
      interval_ms: null,
      cron_expr: null,
    });
    completeRun(db, id, { exitCode: 0 });
    const p = db.prepare("SELECT enabled FROM pulses WHERE id = ?").get(id) as { enabled: number };
    assert.strictEqual(p.enabled, 0);
  });

  it("keeps recurring pulse enabled after completion", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db, { interval_ms: 60000 });
    completeRun(db, id, { exitCode: 0 });
    const p = db.prepare("SELECT enabled FROM pulses WHERE id = ?").get(id) as { enabled: number };
    assert.strictEqual(p.enabled, 1);
  });

  it("keeps cron pulse enabled after completion", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db, { interval_ms: null, cron_expr: "0 9 * * *" });
    completeRun(db, id, { exitCode: 0 });
    const p = db.prepare("SELECT enabled FROM pulses WHERE id = ?").get(id) as { enabled: number };
    assert.strictEqual(p.enabled, 1);
  });

  it("records failure exit code correctly", () => {
    const db = openMemoryDatabase();
    const id = insertRunningPulse(db);
    completeRun(db, id, { exitCode: 127 });
    const p = db.prepare("SELECT last_exit_code FROM pulses WHERE id = ?").get(id) as {
      last_exit_code: number;
    };
    assert.strictEqual(p.last_exit_code, 127);
  });
});
