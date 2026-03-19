import type { ChildProcess } from "node:child_process";
import { fork } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import type { Server, Socket } from "node:net";
import { createConnection, createServer } from "node:net";
import { join, resolve } from "node:path";

export const EXIT_CLEAN = 0;
export const EXIT_RESTART = 75;
export const EXIT_FATAL = 78;

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 120_000;
const KILL_GRACE_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_RESET_MS = 60_000;
const CIRCUIT_BREAKER_WINDOW_MS = 120_000;
const CIRCUIT_BREAKER_MAX_CRASHES = 5;

function socketPath(workspace: string): string {
  if (process.platform === "win32") {
    const hash = workspace.replace(/[^a-zA-Z0-9]/g, "-").slice(-60);
    return `\\\\?\\pipe\\ghostpaw-${hash}`;
  }
  const dir = join(workspace, ".ghostpaw");
  mkdirSync(dir, { recursive: true });
  return join(dir, "supervisor.sock");
}

function tryConnect(path: string): Promise<boolean> {
  return new Promise((res) => {
    const conn = createConnection({ path }, () => {
      conn.end();
      res(true);
    });
    conn.on("error", () => res(false));
  });
}

function killChild(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  try {
    child.kill(signal);
  } catch {}
}

function killEscalation(child: ChildProcess): NodeJS.Timeout {
  return setTimeout(() => killChild(child, "SIGKILL"), KILL_GRACE_MS);
}

export async function runSupervised(): Promise<never> {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
  const sock = socketPath(workspace);

  if (await tryConnect(sock)) {
    process.stderr.write(
      "Ghostpaw is already running. Use 'ghostpaw service restart' to restart.\n",
    );
    process.exit(1);
  }

  if (existsSync(sock)) {
    try {
      unlinkSync(sock);
    } catch {}
  }

  let child: ChildProcess | null = null;
  let shouldRestart = false;
  const startedAt = Date.now();
  const crashTimes: number[] = [];

  const server: Server = createServer((conn: Socket) => {
    let buf = "";
    conn.on("data", (chunk) => {
      buf += chunk.toString();
      if (!buf.includes("\n")) return;
      const line = buf.slice(0, buf.indexOf("\n"));
      buf = "";
      try {
        const msg = JSON.parse(line) as { cmd?: string };
        if (msg.cmd === "restart") {
          shouldRestart = true;
          if (child) killChild(child);
          conn.end(`${JSON.stringify({ ok: true, action: "restarting" })}\n`);
        } else if (msg.cmd === "stop") {
          shouldRestart = false;
          if (child) killChild(child);
          else process.exit(EXIT_CLEAN);
          conn.end(`${JSON.stringify({ ok: true, action: "stopping" })}\n`);
        } else if (msg.cmd === "status") {
          conn.end(
            `${JSON.stringify({
              ok: true,
              pid: process.pid,
              childPid: child?.pid ?? null,
              uptime: Math.round((Date.now() - startedAt) / 1000),
              crashes: crashTimes.length,
            })}\n`,
          );
        } else {
          conn.end(`${JSON.stringify({ ok: false, error: "unknown command" })}\n`);
        }
      } catch {
        conn.end(`${JSON.stringify({ ok: false, error: "invalid json" })}\n`);
      }
    });
  });

  server.listen(sock);
  server.unref();

  const cleanup = () => {
    server.close();
    if (existsSync(sock)) {
      try {
        unlinkSync(sock);
      } catch {}
    }
  };

  let backoff = 1000;

  for (;;) {
    const forkStart = Date.now();
    shouldRestart = false;

    if (process.stdin.isTTY) {
      try {
        (process.stdin as NodeJS.ReadStream).setRawMode?.(false);
      } catch {}
    }

    try {
      child = fork(process.argv[1]!, process.argv.slice(2), {
        env: { ...process.env, GHOSTPAW_SUPERVISED: "1" },
        stdio: ["inherit", "inherit", "inherit", "ipc"],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`supervisor: fork failed: ${msg}\n`);
      cleanup();
      process.exit(1);
    }

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    let shuttingDown = false;

    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        shuttingDown = true;
        killChild(child!);
        graceTimer = killEscalation(child!);
      }, HEARTBEAT_TIMEOUT_MS);
    };
    resetWatchdog();

    child.on("message", (msg: unknown) => {
      if (msg && typeof msg === "object" && (msg as { type?: string }).type === "heartbeat") {
        resetWatchdog();
      }
    });

    const forwardSignal = (sig: NodeJS.Signals) => {
      if (shuttingDown) return;
      shuttingDown = true;
      killChild(child!, sig);
      graceTimer = killEscalation(child!);
    };

    process.on("SIGTERM", forwardSignal);
    process.on("SIGINT", forwardSignal);

    const code = await new Promise<number>((res) => {
      child!.on("exit", (c) => res(c ?? 1));
    });

    clearTimeout(watchdog);
    clearTimeout(graceTimer);
    process.removeListener("SIGTERM", forwardSignal);
    process.removeListener("SIGINT", forwardSignal);
    child = null;

    if (code === EXIT_CLEAN && !shouldRestart) {
      cleanup();
      process.exit(EXIT_CLEAN);
    }

    if (code === EXIT_FATAL) {
      cleanup();
      process.exit(EXIT_FATAL);
    }

    if (code === EXIT_RESTART || shouldRestart) {
      backoff = 1000;
      continue;
    }

    const now = Date.now();
    crashTimes.push(now);
    while (crashTimes.length > 0 && now - crashTimes[0]! > CIRCUIT_BREAKER_WINDOW_MS) {
      crashTimes.shift();
    }
    if (crashTimes.length >= CIRCUIT_BREAKER_MAX_CRASHES) {
      process.stderr.write(
        `supervisor: ${CIRCUIT_BREAKER_MAX_CRASHES} crashes in ${CIRCUIT_BREAKER_WINDOW_MS / 1000}s, giving up\n`,
      );
      cleanup();
      process.exit(1);
    }

    if (now - forkStart > BACKOFF_RESET_MS) backoff = 1000;
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  }
}

export function startHeartbeat(): void {
  if (typeof process.send !== "function") return;

  const iv = setInterval(() => {
    process.send!({ type: "heartbeat" });
  }, HEARTBEAT_INTERVAL_MS);
  iv.unref();

  process.on("disconnect", () => {
    clearInterval(iv);
    process.kill(process.pid, "SIGTERM");
  });
}

export function requestRestart(): void {
  process.exitCode = EXIT_RESTART;
  process.kill(process.pid, "SIGTERM");
}

export function sendCommand(
  workspace: string,
  cmd: string,
): Promise<{ ok: boolean; [k: string]: unknown }> {
  const sock = socketPath(workspace);
  return new Promise((res, rej) => {
    const conn = createConnection({ path: sock }, () => {
      conn.write(`${JSON.stringify({ cmd })}\n`);
    });
    let buf = "";
    conn.on("data", (chunk) => {
      buf += chunk.toString();
      if (!buf.includes("\n")) return;
      try {
        const parsed = JSON.parse(buf.slice(0, buf.indexOf("\n")));
        conn.end();
        res(parsed);
      } catch (err) {
        conn.end();
        rej(err);
      }
    });
    conn.on("error", (err) => rej(err));
  });
}
