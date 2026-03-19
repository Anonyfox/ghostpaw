import { setConfig } from "../../core/config/api/write/index.ts";
import type { CommandContext, CommandResult } from "./types.ts";

const COOLDOWN_MS = 30_000;
let lastRestartMs = 0;

export function resetCooldown(): void {
  lastRestartMs = 0;
}

export async function executeRestart(ctx: CommandContext, _args: string): Promise<CommandResult> {
  const now = Date.now();
  const elapsed = now - lastRestartMs;
  if (lastRestartMs > 0 && elapsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return { text: `Restart on cooldown. Try again in ${remaining}s.` };
  }

  lastRestartMs = now;

  const channel = ctx.sessionKey.split(":")[0] ?? "unknown";
  const context = JSON.stringify({
    channel,
    sessionKey: ctx.sessionKey,
    timestamp: now,
  });
  setConfig(ctx.db, "_restart_context", context, "agent");

  return {
    text: "Restarting ghostpaw...",
    action: { type: "restart" },
  };
}
