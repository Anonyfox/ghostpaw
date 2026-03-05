import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectInitSystem } from "./detect_init_system.ts";

const SYSTEMD_SERVICE_NAME = "ghostpaw.service";

/**
 * Streams service logs to stdout. Blocks until interrupted (Ctrl+C).
 * Uses journalctl for systemd, tail -f for launchd/cron stderr log.
 */
export function serviceLogs(workspace: string): void {
  const initSystem = detectInitSystem();

  if (initSystem === "systemd") {
    const child = spawn(
      "journalctl",
      ["--user", "-u", SYSTEMD_SERVICE_NAME, "-f", "--no-pager", "-n", "50"],
      { stdio: "inherit" },
    );
    process.on("SIGINT", () => child.kill());
    return;
  }

  const logPath = join(workspace, ".ghostpaw", "stderr.log");
  if (!existsSync(logPath)) {
    console.log("No log file found. Has the service run yet?");
    console.log(`  Expected: ${logPath}`);
    return;
  }

  const child = spawn("tail", ["-f", "-n", "50", logPath], { stdio: "inherit" });
  process.on("SIGINT", () => child.kill());
}
