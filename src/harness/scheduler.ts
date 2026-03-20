import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import type { Schedule } from "../core/schedule/api/types.ts";
import {
  claimSchedule,
  clearStalePids,
  completeRun,
  getDueSchedules,
} from "../core/schedule/runtime/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { log } from "../lib/terminal/index.ts";

const DEFAULT_TICK_MS = 30_000;
const MAX_STDERR_BYTES = 1024;

export interface SchedulerHandle {
  stop(): Promise<void>;
  readonly children: ReadonlyMap<number, ChildProcess>;
}

export interface SchedulerOptions {
  tickMs?: number;
}

export function startScheduler(
  db: DatabaseHandle,
  workspace: string,
  opts?: SchedulerOptions,
): SchedulerHandle {
  const tickMs = opts?.tickMs ?? DEFAULT_TICK_MS;
  const children = new Map<number, ChildProcess>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function tick(): void {
    if (stopped) return;
    try {
      clearStalePids(db);
      const now = Date.now();
      const due = getDueSchedules(db, now);

      for (const schedule of due) {
        if (children.has(schedule.id)) continue;

        const newNextRun = now + schedule.intervalMs;
        const claimed = claimSchedule(db, schedule.id, schedule.nextRunAt, newNextRun, process.pid);
        if (!claimed) continue;

        spawnJob(db, schedule, workspace, children);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`scheduler tick failed: ${msg}`);
    }

    if (!stopped) {
      timer = setTimeout(tick, tickMs);
    }
  }

  const jitter = Math.floor(Math.random() * tickMs);
  timer = setTimeout(tick, jitter);

  return {
    children,
    async stop() {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      if (children.size === 0) return;

      log.info(`scheduler stopping ${children.size} running job(s)`);
      for (const child of children.values()) {
        child.kill("SIGTERM");
      }

      await new Promise<void>((resolve) => {
        const deadline = setTimeout(() => {
          for (const child of children.values()) {
            child.kill("SIGKILL");
          }
          resolve();
        }, 5_000);

        const check = setInterval(() => {
          if (children.size === 0) {
            clearInterval(check);
            clearTimeout(deadline);
            resolve();
          }
        }, 100);
      });
    },
  };
}

function spawnJob(
  db: DatabaseHandle,
  schedule: Schedule,
  workspace: string,
  children: Map<number, ChildProcess>,
): void {
  const startTime = Date.now();
  const cmdParts = schedule.command.split(/\s+/).filter(Boolean);
  const args =
    schedule.type === "builtin"
      ? [...process.execArgv, process.argv[1], ...cmdParts, "--workspace", workspace]
      : ["-c", schedule.command];
  const cmd = schedule.type === "builtin" ? process.execPath : "/bin/sh";

  const child = spawn(cmd, args, {
    cwd: workspace,
    env: process.env,
    stdio: ["ignore", "ignore", "pipe"],
    detached: false,
  });

  const pid = child.pid ?? 0;
  children.set(schedule.id, child);
  log.info(`scheduler started ${schedule.name} (pid ${pid})`);

  let stderr = "";
  let timedOut = false;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let killTimer: ReturnType<typeof setTimeout> | null = null;

  if (schedule.timeoutMs !== null) {
    timeoutTimer = setTimeout(() => {
      timedOut = true;
      log.warn(`scheduler timeout ${schedule.name} after ${schedule.timeoutMs}ms, sending SIGTERM`);
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5_000);
    }, schedule.timeoutMs);
  }

  function clearTimers(): void {
    if (timeoutTimer !== null) clearTimeout(timeoutTimer);
    if (killTimer !== null) clearTimeout(killTimer);
  }

  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
    if (stderr.length > MAX_STDERR_BYTES * 2) {
      stderr = stderr.slice(-MAX_STDERR_BYTES);
    }
  });

  child.on("error", (err) => {
    clearTimers();
    children.delete(schedule.id);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error(`scheduler error ${schedule.name} (${elapsed}s): ${err.message}`);
    completeRun(db, schedule.id, -1, err.message);
  });

  child.on("close", (code) => {
    clearTimers();
    children.delete(schedule.id);
    const exitCode = code ?? -1;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (timedOut) {
      const errorText = `job timed out after ${schedule.timeoutMs}ms`;
      log.warn(`scheduler timeout-killed ${schedule.name} (${elapsed}s)`);
      completeRun(db, schedule.id, exitCode, errorText);
      return;
    }

    const errorText = exitCode !== 0 ? stderr.slice(-MAX_STDERR_BYTES).trim() || null : null;

    if (exitCode === 0) {
      log.info(`scheduler finished ${schedule.name} (${elapsed}s)`);
    } else {
      const detail = errorText ? `: ${errorText.split("\n").pop()}` : "";
      log.warn(`scheduler failed ${schedule.name} (exit ${exitCode}, ${elapsed}s)${detail}`);
    }

    completeRun(db, schedule.id, exitCode, errorText);
  });
}
