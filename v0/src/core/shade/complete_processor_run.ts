import type { DatabaseHandle } from "../../lib/database_handle.ts";

export interface ProcessorRunCompletion {
  runId: number;
  status: "done" | "error";
  resultCount?: number;
  processSessionId?: number | null;
  error?: string;
}

export function completeProcessorRun(db: DatabaseHandle, opts: ProcessorRunCompletion): void {
  db.prepare(
    `UPDATE shade_runs
     SET status = ?, result_count = ?, process_session_id = ?, error = ?,
         finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`,
  ).run(
    opts.status,
    opts.resultCount ?? null,
    opts.processSessionId ?? null,
    opts.error ?? null,
    opts.runId,
  );
}
