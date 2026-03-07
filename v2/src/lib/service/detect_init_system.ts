import { spawnSync } from "node:child_process";
import type { InitSystem } from "./types.ts";

function hasCommand(cmd: string): boolean {
  const r = spawnSync("which", [cmd], { stdio: "pipe", encoding: "utf-8" });
  return r.status === 0;
}

export function detectInitSystem(): InitSystem {
  if (process.platform === "darwin" && hasCommand("launchctl")) return "launchd";
  if (hasCommand("systemctl")) return "systemd";
  return "cron";
}
