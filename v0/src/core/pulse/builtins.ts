import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { BuiltinHandler, JobResult } from "./types.ts";

export async function heartbeatHandler(
  db: DatabaseHandle,
  _signal: AbortSignal,
): Promise<JobResult> {
  const untitled = db
    .prepare("SELECT COUNT(*) as c FROM sessions WHERE purpose = 'chat' AND title IS NULL")
    .get() as { c: number };
  const failing = db
    .prepare(
      "SELECT COUNT(*) as c FROM pulses WHERE last_exit_code IS NOT NULL AND last_exit_code != 0",
    )
    .get() as { c: number };
  const active = db.prepare("SELECT COUNT(*) as c FROM pulses WHERE running = 1").get() as {
    c: number;
  };
  const pageRow = db.prepare("PRAGMA page_count").get() as { page_count: number } | undefined;
  const pageCount = pageRow?.page_count ?? 0;

  const checks = {
    untitled_chat_sessions: untitled.c,
    failing_pulses: failing.c,
    running_pulses: active.c,
    db_page_count: pageCount,
  };

  return {
    exitCode: 0,
    output: JSON.stringify(checks),
  };
}

export const BUILTINS: Record<string, BuiltinHandler> = {
  heartbeat: heartbeatHandler,
};

export async function runBuiltin(
  db: DatabaseHandle,
  command: string,
  signal: AbortSignal,
): Promise<JobResult> {
  const handler = BUILTINS[command];
  if (!handler) {
    return { exitCode: 1, error: `unknown builtin: ${command}` };
  }
  return handler(db, signal);
}
