import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { detectInitSystem } from "./detect_init_system.ts";
import { generateLaunchdPlist, launchdLabel } from "./generate_plist.ts";
import { generateSystemdUnit } from "./generate_unit.ts";
import { generateWatchdogScript } from "./generate_watchdog.ts";
import type { ServiceConfig, ServiceResult } from "./types.ts";

const SYSTEMD_SERVICE_NAME = "ghostpaw.service";

function exec(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf-8" });
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim() };
}

function installSystemd(config: ServiceConfig): ServiceResult {
  const dir = join(homedir(), ".config", "systemd", "user");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, SYSTEMD_SERVICE_NAME);
  writeFileSync(path, generateSystemdUnit(config), "utf-8");

  exec("loginctl", ["enable-linger", userInfo().username]);
  const reload = exec("systemctl", ["--user", "daemon-reload"]);
  if (!reload.ok) {
    return { success: false, message: "Failed to reload systemd", initSystem: "systemd", path };
  }

  const enable = exec("systemctl", ["--user", "enable", "--now", SYSTEMD_SERVICE_NAME]);
  if (!enable.ok) {
    return { success: false, message: "Failed to enable service", initSystem: "systemd", path };
  }

  return { success: true, message: "Service installed and started", initSystem: "systemd", path };
}

function installLaunchd(config: ServiceConfig): ServiceResult {
  const dir = join(homedir(), "Library", "LaunchAgents");
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(config.workspace, ".ghostpaw"), { recursive: true });

  const path = join(dir, `${launchdLabel()}.plist`);
  writeFileSync(path, generateLaunchdPlist(config), "utf-8");

  exec("launchctl", ["unload", path]);
  const load = exec("launchctl", ["load", path]);
  if (!load.ok) {
    return { success: false, message: "Failed to load LaunchAgent", initSystem: "launchd", path };
  }

  return { success: true, message: "Service installed and started", initSystem: "launchd", path };
}

function installCron(config: ServiceConfig): ServiceResult {
  const dir = join(config.workspace, ".ghostpaw");
  mkdirSync(dir, { recursive: true });

  const path = join(dir, "watchdog.sh");
  writeFileSync(path, generateWatchdogScript(config), { mode: 0o755 });

  const existing = exec("crontab", ["-l"]);
  const lines = existing.ok ? existing.stdout : "";
  if (lines.includes(path)) {
    return { success: true, message: "Service already installed", initSystem: "cron", path };
  }

  const entry = `@reboot ${path}`;
  const newCrontab = lines ? `${lines}\n${entry}\n` : `${entry}\n`;
  const write = spawnSync("crontab", ["-"], {
    input: newCrontab,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf-8",
  });

  if (write.status !== 0) {
    return { success: false, message: "Failed to update crontab", initSystem: "cron", path };
  }

  const child = spawn("sh", [path], { stdio: "ignore", detached: true });
  child.unref();

  return { success: true, message: "Watchdog installed and started", initSystem: "cron", path };
}

export function installService(config: ServiceConfig): ServiceResult {
  const initSystem = detectInitSystem();
  switch (initSystem) {
    case "systemd":
      return installSystemd(config);
    case "launchd":
      return installLaunchd(config);
    case "cron":
      return installCron(config);
  }
}
