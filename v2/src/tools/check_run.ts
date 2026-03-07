import { createTool, Schema } from "chatoyant";
import { getSession, getSessionMessage } from "../core/chat/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";

class CheckRunParams extends Schema {
  run_id = Schema.Integer({
    description: "The run ID returned by a background delegate call. Must be a positive integer.",
  });
}

function deriveStatus(session: { closedAt: number | null; error: string | null }): string {
  if (!session.closedAt) return "running";
  return session.error ? "failed" : "completed";
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
      const session = getSession(db, run_id);
      if (!session || session.purpose !== "delegate") {
        return {
          error: `No delegation run found with ID ${run_id}. Verify the run_id from your delegate call.`,
        };
      }

      const status = deriveStatus(session);
      const task = getSessionMessage(db, run_id, "user", "first");
      const result =
        status === "completed" ? getSessionMessage(db, run_id, "assistant", "last") : undefined;

      return {
        runId: session.id,
        status,
        task,
        ...(result != null && { result }),
        ...(session.error != null && { error: session.error }),
        model: session.model,
        tokensIn: session.tokensIn,
        tokensOut: session.tokensOut,
        costUsd: session.costUsd,
        createdAt: session.createdAt,
        ...(session.closedAt != null && { completedAt: session.closedAt }),
      };
    },
  });
}
