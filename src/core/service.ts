import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join, resolve } from "node:path";

export type InitSystem = "systemd" | "launchd" | "cron";

export interface ServiceConfig {
  workspace: string;
  nodePath: string;
  ghostpawPath: string;
}

export interface ServiceResult {
  success: boolean;
  message: string;
  initSystem: InitSystem;
  path?: string;
}

export interface ServiceStatus {
  installed: boolean;
  running: boolean;
  initSystem: InitSystem;
  pid?: number;
}

// ── Safe command helpers ────────────────────────────────────────────────────

function exec(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf-8" });
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim() };
}

function hasCommand(cmd: string): boolean {
  return exec("which", [cmd]).ok;
}

function isNumericPid(s: string): boolean {
  return /^\d+$/.test(s.trim());
}

// ── Init system detection ───────────────────────────────────────────────────

export function detectInitSystem(): InitSystem {
  if (process.platform === "darwin" && hasCommand("launchctl")) return "launchd";
  if (hasCommand("systemctl")) return "systemd";
  return "cron";
}

// ── File content generators (pure, testable) ────────────────────────────────

const SYSTEMD_SERVICE_NAME = "ghostpaw.service";
const LAUNCHD_LABEL = "com.ghostpaw.agent";

function systemdDir(): string {
  return join(homedir(), ".config", "systemd", "user");
}

function systemdPath(): string {
  return join(systemdDir(), SYSTEMD_SERVICE_NAME);
}

function launchdPath(): string {
  return join(homedir(), "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
}

function runtimeDir(workspace: string): string {
  return join(workspace, ".ghostpaw");
}

function watchdogPath(workspace: string): string {
  return join(runtimeDir(workspace), "watchdog.sh");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function generateSystemdUnit(config: ServiceConfig): string {
  return `[Unit]
Description=Ghostpaw AI Agent
After=network.target

[Service]
Type=simple
ExecStart="${config.nodePath}" --experimental-sqlite "${config.ghostpawPath}"
WorkingDirectory=${config.workspace}
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;
}

export function generateLaunchdPlist(config: ServiceConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(config.nodePath)}</string>
    <string>--experimental-sqlite</string>
    <string>${escapeXml(config.ghostpawPath)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(config.workspace)}</string>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardErrorPath</key>
  <string>${escapeXml(join(runtimeDir(config.workspace), "stderr.log"))}</string>
</dict>
</plist>
`;
}

export function generateWatchdogScript(config: ServiceConfig): string {
  const dir = runtimeDir(config.workspace);
  return `#!/bin/sh
PIDFILE="${dir}/watchdog.pid"
echo $$ > "$PIDFILE"
while true; do
  "${config.nodePath}" --experimental-sqlite "${config.ghostpawPath}" 2>>"${dir}/stderr.log"
  sleep 5
done
`;
}

// ── Install ─────────────────────────────────────────────────────────────────

function installSystemd(config: ServiceConfig): ServiceResult {
  const dir = systemdDir();
  mkdirSync(dir, { recursive: true });
  const path = systemdPath();
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
  mkdirSync(runtimeDir(config.workspace), { recursive: true });

  const path = launchdPath();
  writeFileSync(path, generateLaunchdPlist(config), "utf-8");

  exec("launchctl", ["unload", path]);
  const load = exec("launchctl", ["load", path]);
  if (!load.ok) {
    return { success: false, message: "Failed to load LaunchAgent", initSystem: "launchd", path };
  }

  return { success: true, message: "Service installed and started", initSystem: "launchd", path };
}

function installCron(config: ServiceConfig): ServiceResult {
  const dir = runtimeDir(config.workspace);
  mkdirSync(dir, { recursive: true });

  const path = watchdogPath(config.workspace);
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

// ── Uninstall ───────────────────────────────────────────────────────────────

function uninstallSystemd(): ServiceResult {
  exec("systemctl", ["--user", "stop", SYSTEMD_SERVICE_NAME]);
  exec("systemctl", ["--user", "disable", SYSTEMD_SERVICE_NAME]);
  const path = systemdPath();
  if (existsSync(path)) unlinkSync(path);
  exec("systemctl", ["--user", "daemon-reload"]);
  return { success: true, message: "Service removed", initSystem: "systemd" };
}

function uninstallLaunchd(): ServiceResult {
  const path = launchdPath();
  exec("launchctl", ["unload", path]);
  if (existsSync(path)) unlinkSync(path);
  return { success: true, message: "Service removed", initSystem: "launchd" };
}

function uninstallCron(workspace: string): ServiceResult {
  const path = watchdogPath(workspace);
  const pidFile = join(runtimeDir(workspace), "watchdog.pid");

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

  const existing = exec("crontab", ["-l"]);
  if (existing.ok && existing.stdout.includes(path)) {
    const filtered = existing.stdout
      .split("\n")
      .filter((l) => !l.includes(path))
      .join("\n");
    spawnSync("crontab", ["-"], {
      input: filtered + "\n",
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

// ── Status ──────────────────────────────────────────────────────────────────

function statusSystemd(): ServiceStatus {
  const installed = existsSync(systemdPath());
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
  const installed = existsSync(launchdPath());
  if (!installed) return { installed: false, running: false, initSystem: "launchd" };

  const list = exec("launchctl", ["list"]);
  if (!list.ok) return { installed, running: false, initSystem: "launchd" };

  const line = list.stdout.split("\n").find((l) => l.includes(LAUNCHD_LABEL));
  if (!line) return { installed, running: false, initSystem: "launchd" };

  const pidStr = line.trim().split(/\s+/)[0];
  const running = pidStr !== "-";
  const pid = running ? Number.parseInt(pidStr, 10) : undefined;
  return { installed, running, initSystem: "launchd", pid };
}

function statusCron(workspace: string): ServiceStatus {
  const installed = existsSync(watchdogPath(workspace));
  if (!installed) return { installed: false, running: false, initSystem: "cron" };

  const pidFile = join(runtimeDir(workspace), "watchdog.pid");
  if (!existsSync(pidFile)) return { installed, running: false, initSystem: "cron" };

  const raw = readFileSync(pidFile, "utf-8").trim();
  if (!isNumericPid(raw)) return { installed, running: false, initSystem: "cron" };

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

// ── Logs (from SQLite) ──────────────────────────────────────────────────────

export async function serviceLogs(workspace: string): Promise<void> {
  const { createDatabase } = await import("./database.js");
  const dbPath = resolve(workspace, "ghostpaw.db");
  if (!existsSync(dbPath)) {
    console.log("No database found. Has ghostpaw run yet?");
    return;
  }

  const db = await createDatabase(dbPath);

  const initial = db.sqlite
    .prepare("SELECT * FROM logs ORDER BY id DESC LIMIT 50")
    .all() as Record<string, unknown>[];

  for (const row of initial.reverse()) {
    printLogRow(row);
  }

  let lastId = initial.length > 0 ? (initial[initial.length - 1].id as number) : 0;

  const poll = setInterval(() => {
    const rows = db.sqlite
      .prepare("SELECT * FROM logs WHERE id > ? ORDER BY id ASC")
      .all(lastId) as Record<string, unknown>[];
    for (const row of rows) {
      printLogRow(row);
      lastId = row.id as number;
    }
  }, 2000);

  process.on("SIGINT", () => {
    clearInterval(poll);
    db.close();
    process.exit(0);
  });
}

function printLogRow(row: Record<string, unknown>): void {
  const ts = new Date(row.created_at as number).toISOString();
  const level = (row.level as string).toUpperCase().padEnd(5);
  console.log(`${ts} ${level} ${row.message}`);
}
