import { statfsSync, statSync } from "node:fs";
import { resolveDbPath } from "../../lib/resolve_db_path.ts";
import { serviceStatus } from "../../lib/service/index.ts";
import { sendCommand } from "../../lib/supervisor.ts";
import type { CommandContext, CommandResult } from "./types.ts";

export function formatUptime(seconds: number): string {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function gatherDiskInfo(workspace: string): string {
  try {
    const fs = statfsSync(workspace);
    const total = fs.blocks * fs.bsize;
    const free = fs.bavail * fs.bsize;
    return `${formatBytes(total - free)} used / ${formatBytes(free)} free`;
  } catch {
    return "unavailable"; // statfsSync fails on virtual/network filesystems
  }
}

function gatherDbSize(workspace: string): string {
  try {
    const info = statSync(resolveDbPath(workspace));
    return formatBytes(info.size);
  } catch {
    return "unavailable"; // database file not yet created
  }
}

async function gatherSupervisorInfo(workspace: string): Promise<string> {
  try {
    const resp = await sendCommand(workspace, "status");
    if (resp.ok) {
      return `PID ${resp.pid}, ${resp.crashes} crash(es)`;
    }
    return "not supervised";
  } catch {
    return "not supervised"; // supervisor socket unavailable
  }
}

export async function executeStatus(ctx: CommandContext, _args: string): Promise<CommandResult> {
  const sv = await gatherSupervisorInfo(ctx.workspace);
  const svc = serviceStatus(ctx.workspace);
  const svcLine = svc.installed
    ? `${svc.initSystem} (installed${svc.running ? ", running" : ""})`
    : `${svc.initSystem} (not installed)`;

  const lines = [
    `Version:    ${ctx.version}`,
    `Uptime:     ${formatUptime(process.uptime())}`,
    `Supervisor: ${sv}`,
    `Service:    ${svcLine}`,
    `Disk:       ${gatherDiskInfo(ctx.workspace)}`,
    `Database:   ${gatherDbSize(ctx.workspace)}`,
  ];

  return { text: lines.join("\n") };
}
