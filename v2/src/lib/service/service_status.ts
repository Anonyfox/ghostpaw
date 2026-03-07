import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectInitSystem } from "./detect_init_system.ts";
import { launchdLabel } from "./generate_plist.ts";
import type { ServiceStatus } from "./types.ts";

const SYSTEMD_SERVICE_NAME = "ghostpaw.service";

function exec(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf-8" });
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim() };
}

function statusSystemd(): ServiceStatus {
  const path = join(homedir(), ".config", "systemd", "user", SYSTEMD_SERVICE_NAME);
  const installed = existsSync(path);
  if (!installed) return { installed: false, running: false, initSystem: "systemd" };

  const active = exec("systemctl", ["--user", "is-active", SYSTEMD_SERVICE_NAME]);
  const running = active.stdout === "active";
  let pid: number | undefined;
  if (running) {
    const pidResult = exec("systemctl", [
      "--user",
      "show",
      SYSTEMD_SERVICE_NAME,
      "--property=MainPID",
      "--value",
    ]);
    const parsed = Number.parseInt(pidResult.stdout, 10);
    if (parsed > 0) pid = parsed;
  }
  return { installed, running, initSystem: "systemd", pid };
}

function statusLaunchd(): ServiceStatus {
  const path = join(homedir(), "Library", "LaunchAgents", `${launchdLabel()}.plist`);
  const installed = existsSync(path);
  if (!installed) return { installed: false, running: false, initSystem: "launchd" };

  const list = exec("launchctl", ["list"]);
  if (!list.ok) return { installed, running: false, initSystem: "launchd" };

  const label = launchdLabel();
  const line = list.stdout.split("\n").find((l) => l.includes(label));
  if (!line) return { installed, running: false, initSystem: "launchd" };

  const pidStr = line.trim().split(/\s+/)[0];
  const running = pidStr !== "-" && pidStr !== undefined;
  const pid = running ? Number.parseInt(pidStr, 10) : undefined;
  return { installed, running, initSystem: "launchd", pid };
}

function statusCron(workspace: string): ServiceStatus {
  const path = join(workspace, ".ghostpaw", "watchdog.sh");
  const installed = existsSync(path);
  if (!installed) return { installed: false, running: false, initSystem: "cron" };

  const pidFile = join(workspace, ".ghostpaw", "watchdog.pid");
  if (!existsSync(pidFile)) return { installed, running: false, initSystem: "cron" };

  const raw = readFileSync(pidFile, "utf-8").trim();
  if (!/^\d+$/.test(raw)) return { installed, running: false, initSystem: "cron" };

  const pid = Number.parseInt(raw, 10);
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch {
    // not running
  }
  return { installed, running: alive, initSystem: "cron", pid: alive ? pid : undefined };
}

export function serviceStatus(workspace: string): ServiceStatus {
  const initSystem = detectInitSystem();
  switch (initSystem) {
    case "systemd":
      return statusSystemd();
    case "launchd":
      return statusLaunchd();
    case "cron":
      return statusCron(workspace);
  }
}
