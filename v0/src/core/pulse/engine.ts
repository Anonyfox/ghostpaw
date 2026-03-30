import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { RuntimeContext } from "../../runtime.ts";
import { getSettingInt } from "../settings/get.ts";
import { runBuiltin } from "./builtins.ts";
import { claimPulse } from "./claim.ts";
import { cap, completeRun } from "./complete.ts";
import { nextCronRun } from "./cron.ts";
import type { Pulse, RunAgentTask } from "./types.ts";

const MAX_OUTPUT = 2048;
const ONE_OFF_SENTINEL = "9999-12-31T23:59:59.000Z";
const PRUNE_EVERY_TICKS = 60;

export interface PulseEngineHandle {
  stop(): Promise<void>;
}

type ActiveEntry = {
  abort?: AbortController;
  child?: ChildProcess;
  killTimer?: ReturnType<typeof setTimeout>;
  aborted: boolean;
};

function unlockPulse(db: DatabaseHandle, pulseId: number): void {
  try {
    db.prepare(
      "UPDATE pulses SET running = 0, running_pid = NULL, started_at = NULL WHERE id = ?",
    ).run(pulseId);
  } catch {
    /* ignore */
  }
}

function safeComplete(
  db: DatabaseHandle,
  pulseId: number,
  result: Parameters<typeof completeRun>[2],
): void {
  try {
    completeRun(db, pulseId, result);
  } catch (err) {
    console.error("[pulse] completeRun failed:", pulseId, err);
    unlockPulse(db, pulseId);
  }
}

function rowToPulse(row: Record<string, unknown>): Pulse {
  return row as unknown as Pulse;
}

function resetStalePulses(db: DatabaseHandle): void {
  const rows = db.prepare("SELECT id FROM pulses WHERE running = 1").all() as Array<{ id: number }>;
  for (const r of rows) {
    safeComplete(db, r.id, { exitCode: 1, error: "stale: process restarted" });
  }
}

function pruneRunHistory(db: DatabaseHandle): void {
  const days = getSettingInt("GHOSTPAW_PULSE_HISTORY_DAYS") ?? 7;
  db.prepare(
    `DELETE FROM pulse_runs WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-${days} days')`,
  ).run();
}

function getDuePulses(db: DatabaseHandle, limit: number): Pulse[] {
  const rows = db
    .prepare(
      `SELECT * FROM pulses
       WHERE enabled = 1 AND running = 0
         AND next_run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
       ORDER BY next_run_at ASC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToPulse);
}

function computeNextRun(p: Pulse): string {
  if (p.interval_ms != null && p.interval_ms > 0) {
    return new Date(Date.now() + p.interval_ms).toISOString();
  }
  if (p.cron_expr) {
    return nextCronRun(p.cron_expr, new Date()).toISOString();
  }
  return ONE_OFF_SENTINEL;
}

function handleTimeouts(db: DatabaseHandle, active: Map<number, ActiveEntry>): void {
  const timedOut = db
    .prepare(
      `SELECT * FROM pulses
       WHERE running = 1 AND started_at IS NOT NULL
         AND (unixepoch(started_at) * 1000 + timeout_ms) < (unixepoch('now') * 1000)`,
    )
    .all() as Record<string, unknown>[];

  for (const row of timedOut) {
    const pulse = rowToPulse(row);
    const entry = active.get(pulse.id);

    if (entry && !entry.aborted) {
      entry.abort?.abort();
      if (entry.child) {
        try {
          entry.child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        entry.killTimer = setTimeout(() => {
          try {
            entry.child?.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 5000);
      }
      entry.aborted = true;
    } else if (entry?.aborted) {
      safeComplete(db, pulse.id, { exitCode: 1, error: "timeout: forced reset" });
      if (entry.killTimer) clearTimeout(entry.killTimer);
      active.delete(pulse.id);
    } else if (!entry) {
      safeComplete(db, pulse.id, { exitCode: 1, error: "timeout: no active handler" });
    }
  }

  for (const [id, entry] of active) {
    const row = db.prepare("SELECT running FROM pulses WHERE id = ?").get(id) as
      | { running: number }
      | undefined;
    if (!row || row.running === 0) {
      entry.abort?.abort();
      if (entry.killTimer) clearTimeout(entry.killTimer);
      active.delete(id);
    }
  }
}

async function dispatchBuiltin(
  ctx: RuntimeContext,
  pulse: Pulse,
  active: Map<number, ActiveEntry>,
): Promise<void> {
  const ac = new AbortController();
  active.set(pulse.id, { abort: ac, aborted: false });
  try {
    const result = await runBuiltin(ctx, pulse.command, ac.signal);
    safeComplete(ctx.db, pulse.id, result);
  } catch (err) {
    safeComplete(ctx.db, pulse.id, {
      exitCode: 1,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    active.delete(pulse.id);
  }
}

async function dispatchAgent(
  db: DatabaseHandle,
  pulse: Pulse,
  active: Map<number, ActiveEntry>,
  runAgentTask: RunAgentTask,
): Promise<void> {
  const ac = new AbortController();
  active.set(pulse.id, { abort: ac, aborted: false });
  try {
    const result = await runAgentTask(pulse.name, pulse.command, ac.signal);
    safeComplete(db, pulse.id, result);
  } catch (err) {
    safeComplete(db, pulse.id, {
      exitCode: 1,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    active.delete(pulse.id);
  }
}

function dispatchShell(db: DatabaseHandle, pulse: Pulse, active: Map<number, ActiveEntry>): void {
  let completed = false;
  let stdout = "";
  let stderr = "";

  const child = spawn("/bin/sh", ["-c", pulse.command], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  active.set(pulse.id, { abort: undefined, child, aborted: false });

  const finish = (fn: () => void) => {
    if (completed) return;
    completed = true;
    fn();
    try {
      child.stdout?.removeAllListeners();
      child.stderr?.removeAllListeners();
      child.removeAllListeners();
    } catch {
      /* ignore */
    }
    active.delete(pulse.id);
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    const s = chunk.toString();
    if (stdout.length < MAX_OUTPUT) {
      stdout += s;
      if (stdout.length > MAX_OUTPUT) stdout = stdout.slice(0, MAX_OUTPUT);
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const s = chunk.toString();
    if (stderr.length < MAX_OUTPUT) {
      stderr += s;
      if (stderr.length > MAX_OUTPUT) stderr = stderr.slice(0, MAX_OUTPUT);
    }
  });

  child.on("close", (code) => {
    finish(() => {
      const out = cap(`${stdout}\n${stderr}`.trim(), MAX_OUTPUT);
      safeComplete(db, pulse.id, { exitCode: code ?? 1, output: out });
    });
  });

  child.on("error", (err) => {
    finish(() => {
      safeComplete(db, pulse.id, { exitCode: 1, error: err.message });
    });
  });

  if (child.pid !== undefined) {
    db.prepare("UPDATE pulses SET running_pid = ? WHERE id = ?").run(child.pid, pulse.id);
  }
}

export function startPulse(ctx: RuntimeContext, runAgentTask: RunAgentTask): PulseEngineHandle {
  const db = ctx.db;
  const stopWaitMs = ctx.config.pulse_stop_wait_ms;
  resetStalePulses(db);
  pruneRunHistory(db);

  const active = new Map<number, ActiveEntry>();
  let tickRunning = false;
  let tickCount = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const guardedTick = async (): Promise<void> => {
    if (tickRunning) return;
    tickRunning = true;
    try {
      tickCount++;
      handleTimeouts(db, active);

      const slotsAvailable = (getSettingInt("GHOSTPAW_PULSE_MAX_CONCURRENT") ?? 5) - active.size;
      if (slotsAvailable <= 0) {
        return;
      }

      const due = getDuePulses(db, slotsAvailable);
      for (const pulse of due) {
        const nextRun = computeNextRun(pulse);
        if (!claimPulse(db, pulse.id, nextRun)) {
          continue;
        }

        if (pulse.type === "builtin") {
          void dispatchBuiltin(ctx, pulse, active).catch((err) =>
            console.error("[pulse] unhandled builtin:", err),
          );
        } else if (pulse.type === "agent") {
          void dispatchAgent(db, pulse, active, runAgentTask).catch((err) =>
            console.error("[pulse] unhandled agent:", err),
          );
        } else if (pulse.type === "shell") {
          try {
            dispatchShell(db, pulse, active);
          } catch (err) {
            safeComplete(db, pulse.id, {
              exitCode: 1,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      if (tickCount % PRUNE_EVERY_TICKS === 0) {
        pruneRunHistory(db);
      }
    } catch (err) {
      console.error("[pulse] tick error:", err);
    } finally {
      tickRunning = false;
    }
  };

  timer = setInterval(() => {
    void guardedTick();
  }, getSettingInt("GHOSTPAW_PULSE_TICK_MS") ?? 60_000);
  void guardedTick();

  return {
    async stop(): Promise<void> {
      if (timer) clearInterval(timer);
      for (const entry of active.values()) {
        entry.abort?.abort();
        if (entry.child) {
          try {
            entry.child.kill("SIGTERM");
          } catch {
            /* ignore */
          }
        }
        if (entry.killTimer) clearTimeout(entry.killTimer);
      }
      const deadline = Date.now() + stopWaitMs;
      while (active.size > 0 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100));
      }
    },
  };
}
