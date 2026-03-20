import { createTool, Schema, type Tool } from "chatoyant";

export interface DelegateArgs {
  task: string;
  specialist?: string;
  model?: string;
  timeout?: number;
  background?: boolean;
}

export type DelegateHandler = (args: DelegateArgs) => Promise<string | Record<string, unknown>>;

class DelegateParams extends Schema {
  task = Schema.String({
    description:
      "Detailed description of the task to delegate. Be specific about what you need done " +
      "and what the expected output should look like.",
  });
  specialist = Schema.String({
    description:
      "Name of a specialist soul to handle the task (e.g. 'JS Engineer'). " +
      "Omit for the default Ghostpaw identity.",
    optional: true,
  });
  model = Schema.String({
    description: "Model override for the sub-agent (e.g. 'gpt-4o', 'claude-sonnet-4-20250514').",
    optional: true,
  });
  timeout = Schema.Integer({
    description: "Max seconds before the delegation is aborted. Default: 1800 (30 min).",
    optional: true,
  });
  background = Schema.Boolean({
    description:
      "If true, the task runs asynchronously. Returns a run ID immediately; " +
      "use check_run to poll for results.",
    optional: true,
  });
}

class SpecialistDelegateParams extends Schema {
  task = Schema.String({
    description:
      "Detailed description of the task to delegate. Be specific about what you need done " +
      "and what the expected output should look like.",
  });
  model = Schema.String({
    description: "Model override for the sub-agent (e.g. 'gpt-4o', 'claude-sonnet-4-20250514').",
    optional: true,
  });
  timeout = Schema.Integer({
    description: "Max seconds before the delegation is aborted. Default: 1800 (30 min).",
    optional: true,
  });
  background = Schema.Boolean({
    description:
      "If true, the task runs asynchronously. Returns a run ID immediately; " +
      "use check_run to poll for results.",
    optional: true,
  });
}

export function createDelegateTool(handler: DelegateHandler, specialists: string[]) {
  const specialistLine =
    specialists.length > 0 ? `\nAvailable specialists: ${specialists.join(", ")}.` : "";

  return createTool({
    name: "delegate",
    description:
      "Delegate a task to a sub-agent that runs autonomously with its own session and " +
      "full tool access. The sub-agent cannot delegate further (no recursion). " +
      "Returns the sub-agent's final response directly, or a run ID if background=true." +
      specialistLine +
      "\nOmit specialist for default Ghostpaw identity. " +
      "Set background=true for async execution; use check_run to poll for results.",
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new DelegateParams() as any,
    execute: async ({ args }) => {
      const { task, specialist, model, timeout, background } = args as DelegateArgs;

      if (!task || task.trim().length === 0) {
        return { error: "Task cannot be empty." };
      }

      return handler({ task: task.trim(), specialist, model, timeout, background });
    },
  });
}

/**
 * Creates a named delegation tool for a specific specialist soul.
 * The specialist name is baked into the tool — no `specialist` parameter needed.
 * Description is derived from the soul's DB description field.
 */
export function createSpecialistDelegateTool(
  toolName: string,
  soulName: string,
  soulDescription: string,
  handler: DelegateHandler,
  descriptionSuffix?: string,
): Tool {
  const desc =
    `Delegate to ${soulName}. ${soulDescription}` +
    (descriptionSuffix ? ` ${descriptionSuffix}` : "") +
    "\nSet background=true for async execution; use check_run to poll for results.";

  return createTool({
    name: toolName,
    description: desc,
    // biome-ignore lint/suspicious/noExplicitAny: chatoyant SchemaInstance index-signature limitation
    parameters: new SpecialistDelegateParams() as any,
    execute: async ({ args }) => {
      const { task, model, timeout, background } = args as Omit<DelegateArgs, "specialist">;

      if (!task || task.trim().length === 0) {
        return { error: "Task cannot be empty." };
      }

      return handler({
        task: task.trim(),
        specialist: soulName,
        model,
        timeout,
        background,
      });
    },
  });
}
