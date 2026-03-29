import type { DatabaseHandle } from "../../lib/database_handle.ts";
import type { JobResult } from "./types.ts";

const CAP = 2048;

export function cap(text: string | undefined, max = CAP): string | undefined {
  if (text === undefined || text === null) return undefined;
  return text.length > max ? text.slice(0, max) : text;
}

export function completeRun(db: DatabaseHandle, pulseId: number, result: JobResult): void {
  const pulse = db
    .prepare("SELECT name, started_at FROM pulses WHERE id = ? AND running = 1")
    .get(pulseId) as { name: string; started_at: string | null } | undefined;
  if (!pulse || !pulse.started_at) {
    return;
  }

  const changes = db
    .prepare(
      `UPDATE pulses
      SET running = 0, running_pid = NULL, started_at = NULL,
          last_run_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
          last_exit_code = ?,
          run_count = run_count + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ? AND running = 1`,
    )
    .run(result.exitCode, pulseId).changes;
  if (changes === 0) {
    return;
  }

  db.prepare(
    `INSERT INTO pulse_runs (pulse_id, pulse_name, session_id, started_at, finished_at, duration_ms, exit_code, error, output)
     VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'),
       (unixepoch('now') * 1000 - unixepoch(?) * 1000), ?, ?, ?)`,
  ).run(
    pulseId,
    pulse.name,
    result.sessionId ?? null,
    pulse.started_at,
    pulse.started_at,
    result.exitCode,
    cap(result.error, CAP) ?? null,
    cap(result.output, CAP) ?? null,
  );

  db.prepare(
    "UPDATE pulses SET enabled = 0 WHERE id = ? AND interval_ms IS NULL AND cron_expr IS NULL",
  ).run(pulseId);
}
