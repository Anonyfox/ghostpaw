import { createTool, Schema } from "chatoyant";
import type { RunStore } from "../core/runs.js";

class CheckRunParams extends Schema {
  run_id = Schema.String({
    description: "The run ID to check status for",
  });
}

export function createCheckRunTool(runs: RunStore) {
  return createTool({
    name: "check_run",
    description:
      "Check the status and result of a background delegated task. " +
      "Returns the current status (running/completed/failed) and result if available.",
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new CheckRunParams() as any,
    execute: async ({ args }) => {
      const { run_id } = args as { run_id: string };

      const run = runs.get(run_id);
      if (!run) {
        return { error: `No run found with ID "${run_id}"` };
      }

      return {
        runId: run.id,
        agent: run.agentProfile,
        status: run.status,
        prompt: run.prompt,
        result: run.result,
        error: run.error,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      };
    },
  });
}
