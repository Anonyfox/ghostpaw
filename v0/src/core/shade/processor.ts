import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { claimProcessorRun } from "./claim_processor_run.ts";
import { completeProcessorRun } from "./complete_processor_run.ts";
import { listUnprocessedImpressions } from "./list_unprocessed_impressions.ts";
import type { ShadeImpression } from "./types.ts";

export interface ProcessorResult {
  resultCount: number;
  processSessionId?: number | null;
}

export type ProcessorCallback = (
  db: DatabaseHandle,
  impression: ShadeImpression,
  signal: AbortSignal,
) => Promise<ProcessorResult>;

export async function runProcessor(
  db: DatabaseHandle,
  processorName: string,
  callback: ProcessorCallback,
  signal: AbortSignal,
  limit = 50,
): Promise<{ processed: number; errors: number }> {
  const impressions = listUnprocessedImpressions(db, processorName, limit);
  let processed = 0;
  let errors = 0;

  for (const impression of impressions) {
    if (signal.aborted) break;

    const runId = claimProcessorRun(db, impression.id, processorName);
    if (runId == null) {
      continue;
    }

    try {
      const result = await callback(db, impression, signal);
      completeProcessorRun(db, {
        runId,
        status: "done",
        resultCount: result.resultCount,
        processSessionId: result.processSessionId,
      });
      processed++;
    } catch (err) {
      completeProcessorRun(db, {
        runId,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      errors++;
    }
  }

  return { processed, errors };
}
