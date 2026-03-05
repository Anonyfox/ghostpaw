import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectInitSystem } from "./detect_init_system.ts";
import { launchdLabel } from "./generate_plist.ts";
import type { ServiceResult } from "./types.ts";

const SYSTEMD_SERVICE_NAME = "ghostpaw.service";

function exec(cmd: string, args: string[]): { ok: boolean } {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf-8" });
  return { ok: r.status === 0 };
}

function uninstallSystemd(): ServiceResult {
  exec("systemctl", ["--user", "stop", SYSTEMD_SERVICE_NAME]);
  exec("systemctl", ["--user", "disable", SYSTEMD_SERVICE_NAME]);
  const path = join(homedir(), ".config", "systemd", "user", SYSTEMD_SERVICE_NAME);
  if (existsSync(path)) unlinkSync(path);
  exec("systemctl", ["--user", "daemon-reload"]);
  return { success: true, message: "Service removed", initSystem: "systemd" };
}

function uninstallLaunchd(): ServiceResult {
  const path = join(homedir(), "Library", "LaunchAgents", `${launchdLabel()}.plist`);
  exec("launchctl", ["unload", path]);
  if (existsSync(path)) unlinkSync(path);
  return { success: true, message: "Service removed", initSystem: "launchd" };
}

function isNumericPid(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

function uninstallCron(workspace: string): ServiceResult {
  const dir = join(workspace, ".ghostpaw");
  const path = join(dir, "watchdog.sh");
  const pidFile = join(dir, "watchdog.pid");

  if (existsSync(pidFile)) {
    const raw = readFileSync(pidFile, "utf-8").trim();
    if (isNumericPid(raw)) {
      try {
        process.kill(Number.parseInt(raw, 10), "SIGTERM");
      } catch {
        // already dead
      }
    }
    unlinkSync(pidFile);
  }

  const existing = spawnSync("crontab", ["-l"], { stdio: "pipe", encoding: "utf-8" });
  if (existing.status === 0 && existing.stdout.includes(path)) {
    const filtered = existing.stdout
      .split("\n")
      .filter((l) => !l.includes(path))
      .join("\n");
    spawnSync("crontab", ["-"], {
      input: `${filtered}\n`,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf-8",
    });
  }

  if (existsSync(path)) unlinkSync(path);
  return { success: true, message: "Service removed", initSystem: "cron" };
}

export function uninstallService(workspace: string): ServiceResult {
  const initSystem = detectInitSystem();
  switch (initSystem) {
    case "systemd":
      return uninstallSystemd();
    case "launchd":
      return uninstallLaunchd();
    case "cron":
      return uninstallCron(workspace);
  }
}
