import assert from "node:assert";
import { describe, it } from "node:test";
import type { RuntimeContext } from "../../runtime.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { ensureDefaultPulses } from "./defaults.ts";
import { startPulse } from "./engine.ts";
import type { RunAgentTask } from "./types.ts";

function makeCtx(db: ReturnType<typeof openMemoryDatabase>): RuntimeContext {
  return { db } as unknown as RuntimeContext;
}

function tick(ms = 20): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("startPulse", () => {
  it("resets stale running pulses on startup", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      `UPDATE pulses SET running = 1, started_at = '2020-01-01T00:00:00.000Z',
       next_run_at = '2099-01-01T00:00:00.000Z' WHERE name = 'heartbeat'`,
    ).run();

    const scheduler = startPulse(makeCtx(db), async () => ({ exitCode: 0 }));
    await scheduler.stop();

    const row = db
      .prepare("SELECT running, run_count, last_exit_code FROM pulses WHERE name = 'heartbeat'")
      .get() as {
      running: number;
      run_count: number;
      last_exit_code: number;
    };
    assert.strictEqual(row.running, 0);
    assert.strictEqual(row.run_count, 1);
    assert.strictEqual(row.last_exit_code, 1);
  });

  it("stale reset creates a pulse_runs record", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      `UPDATE pulses SET running = 1, started_at = '2020-01-01T00:00:00.000Z',
       next_run_at = '2099-01-01T00:00:00.000Z' WHERE name = 'heartbeat'`,
    ).run();

    const scheduler = startPulse(makeCtx(db), async () => ({ exitCode: 0 }));
    await scheduler.stop();

    const run = db
      .prepare("SELECT * FROM pulse_runs WHERE pulse_name = 'heartbeat'")
      .get() as Record<string, unknown>;
    assert.ok(run);
    assert.strictEqual(run.exit_code, 1);
    assert.ok(typeof run.error === "string" && (run.error as string).includes("stale"));
  });

  it("dispatches due builtin pulse on first tick", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      "UPDATE pulses SET next_run_at = '2000-01-01T00:00:00.000Z' WHERE name = 'heartbeat'",
    ).run();

    const scheduler = startPulse(makeCtx(db), async () => ({ exitCode: 0 }));
    await tick(50);
    await scheduler.stop();

    const row = db
      .prepare("SELECT run_count, last_exit_code FROM pulses WHERE name = 'heartbeat'")
      .get() as {
      run_count: number;
      last_exit_code: number;
    };
    assert.strictEqual(row.run_count, 1);
    assert.strictEqual(row.last_exit_code, 0);
  });

  it("dispatches due agent pulse with mock runAgentTask", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      `INSERT INTO pulses (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at)
       VALUES ('test-agent', 'agent', 'do something', NULL, NULL, 60000, 1, '2000-01-01T00:00:00.000Z')`,
    ).run();

    let capturedPrompt = "";
    const mockAgent: RunAgentTask = async (_name, prompt, _signal) => {
      capturedPrompt = prompt;
      return { exitCode: 0, sessionId: null, output: "done" };
    };

    const scheduler = startPulse(makeCtx(db), mockAgent);
    await tick(50);
    await scheduler.stop();

    assert.strictEqual(capturedPrompt, "do something");
    const row = db
      .prepare("SELECT run_count, last_exit_code, enabled FROM pulses WHERE name = 'test-agent'")
      .get() as {
      run_count: number;
      last_exit_code: number;
      enabled: number;
    };
    assert.strictEqual(row.run_count, 1);
    assert.strictEqual(row.last_exit_code, 0);
    assert.strictEqual(row.enabled, 0, "one-off agent pulse should auto-disable");
  });

  it("handles agent task failure gracefully", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare(
      `INSERT INTO pulses (name, type, command, interval_ms, cron_expr, timeout_ms, enabled, next_run_at)
       VALUES ('fail-agent', 'agent', 'crash', 120000, NULL, 60000, 1, '2000-01-01T00:00:00.000Z')`,
    ).run();

    const mockAgent: RunAgentTask = async () => {
      throw new Error("LLM exploded");
    };

    const scheduler = startPulse(makeCtx(db), mockAgent);
    await tick(50);
    await scheduler.stop();

    const row = db
      .prepare("SELECT run_count, last_exit_code, running FROM pulses WHERE name = 'fail-agent'")
      .get() as {
      run_count: number;
      last_exit_code: number;
      running: number;
    };
    assert.strictEqual(row.running, 0, "pulse should not be stuck running");
    assert.strictEqual(row.run_count, 1);
    assert.strictEqual(row.last_exit_code, 1);
  });

  it("prunes old run history on startup", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    db.prepare("UPDATE pulses SET enabled = 0 WHERE name = 'heartbeat'").run();
    const id = Number(db.prepare("SELECT id FROM pulses WHERE name = 'heartbeat'").get()?.id ?? 0);
    db.prepare(
      `INSERT INTO pulse_runs (pulse_id, pulse_name, started_at, finished_at, exit_code, created_at)
       VALUES (?, 'heartbeat', '2020-01-01T00:00:00.000Z', '2020-01-01T00:01:00.000Z', 0, '2020-01-01T00:01:00.000Z')`,
    ).run(id);
    const before = db.prepare("SELECT COUNT(*) as c FROM pulse_runs").get() as { c: number };
    assert.strictEqual(before.c, 1);

    const scheduler = startPulse(makeCtx(db), async () => ({ exitCode: 0 }));
    await scheduler.stop();

    const after = db.prepare("SELECT COUNT(*) as c FROM pulse_runs").get() as { c: number };
    assert.strictEqual(after.c, 0, "old run records should be pruned");
  });

  it("stop resolves even with no active jobs", async () => {
    const db = openMemoryDatabase();
    ensureDefaultPulses(db);
    const scheduler = startPulse(makeCtx(db), async () => ({ exitCode: 0 }));
    await scheduler.stop();
  });
});
