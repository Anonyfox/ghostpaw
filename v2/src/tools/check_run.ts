import { createTool, Schema } from "chatoyant";
import { getRun } from "../core/runs/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

class CheckRunParams extends Schema {
  run_id = Schema.Integer({
    description: "The run ID returned by a background delegate call. Must be a positive integer.",
  });
}

export function createCheckRunTool(db: DatabaseHandle) {
  return createTool({
    name: "check_run",
    description:
      "Check the status and result of a background delegated task. " +
      "Returns status ('running', 'completed', or 'failed'), result or error, " +
      "and token/cost usage. Poll periodically until status is 'completed' or 'failed'.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new CheckRunParams() as any,
    execute: async ({ args }) => {
      const { run_id } = args as { run_id: number };
      const run = getRun(db, run_id);
      if (!run) {
        return {
          error: `No delegation run found with ID ${run_id}. Verify the run_id from your delegate call.`,
        };
      }
      return {
        runId: run.id,
        specialist: run.specialist,
        status: run.status,
        task: run.task,
        ...(run.result != null && { result: run.result }),
        ...(run.error != null && { error: run.error }),
        model: run.model,
        tokensIn: run.tokensIn,
        tokensOut: run.tokensOut,
        costUsd: run.costUsd,
        createdAt: run.createdAt,
        ...(run.completedAt != null && { completedAt: run.completedAt }),
      };
    },
  });
}
