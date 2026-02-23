import { Chat, createTool, Schema, type Tool } from "chatoyant";
import { getAgentProfile, listAgentProfiles } from "../core/agents.js";
import { assembleSystemPrompt } from "../core/context.js";
import { type BudgetTracker, estimateTokens } from "../core/cost.js";
import type { EventBus } from "../core/events.js";
import type { ChatInstance } from "../core/loop.js";
import type { RunStore } from "../core/runs.js";
import type { SessionStore } from "../core/session.js";

class DelegateParams extends Schema {
  task = Schema.String({
    description: "Detailed task description for the agent to accomplish autonomously",
  });
  agent = Schema.String({
    description: "Name of the expert agent to delegate to (omit for a generic agent)",
    optional: true,
  });
  background = Schema.Boolean({
    description:
      "If true, run asynchronously and return immediately. Use check_run to get results later.",
    optional: true,
  });
  model = Schema.String({
    description: "Model override (default: same as parent)",
    optional: true,
  });
}

const DELEGATE_MAX_ITERATIONS = 15;
const DELEGATE_TIMEOUT_MS = 5 * 60 * 1000;
const DELEGATE_CIRCUIT_BREAKER = new Set(["delegate", "check_run"]);

export interface DelegateConfig {
  workspacePath: string;
  tools: Tool[];
  defaultModel: string;
  sessions: SessionStore;
  runs: RunStore;
  parentSessionId: string;
  chatFactory?: (model: string) => ChatInstance;
  eventBus?: EventBus;
  budget?: BudgetTracker;
}

export function createDelegateTool(config: DelegateConfig) {
  const createChat =
    config.chatFactory ?? ((model: string) => new Chat({ model }) as ChatInstance);

  const safeTools = config.tools.filter((t) => !DELEGATE_CIRCUIT_BREAKER.has(t.name));

  return createTool({
    name: "delegate",
    description:
      "Delegate a task to a focused agent that runs autonomously with its own context. " +
      "Agents cannot delegate further (no recursion)." +
      (() => {
        const available = listAgentProfiles(config.workspacePath);
        return available.length > 0 ? ` Available experts: ${available.join(", ")}.` : "";
      })(),
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new DelegateParams() as any,
    execute: async ({ args }) => {
      const { task, agent, background, model } = args as {
        task: string;
        agent?: string;
        background?: boolean;
        model?: string;
      };

      const agentName = agent ?? "default";
      const resolvedModel = model ?? config.defaultModel;

      // Dynamic profile discovery at execution time
      const available = listAgentProfiles(config.workspacePath);
      const profile = agentName !== "default" ? getAgentProfile(config.workspacePath, agentName) : null;
      if (agentName !== "default" && !profile) {
        return { error: `Unknown agent "${agentName}". Available: ${available.join(", ") || "none"}` };
      }

      const systemPrompt = profile
        ? profile.systemPrompt
        : assembleSystemPrompt(config.workspacePath);

      const run = config.runs.create({
        sessionId: config.parentSessionId,
        prompt: task,
        agentProfile: agentName,
        parentSessionId: config.parentSessionId,
      });

      config.eventBus?.emit("delegate:spawn", {
        parentSessionId: config.parentSessionId,
        childRunId: run.id,
        agent: agentName,
      });

      function executeRun(): Promise<string> {
        const chat = createChat(resolvedModel);
        chat.system(systemPrompt);
        for (const tool of safeTools) chat.addTool(tool);
        return chat.user(task).generate({
          maxIterations: DELEGATE_MAX_ITERATIONS,
          onToolError: "respond",
        });
      }

      function recordBudget(result: string) {
        if (!config.budget) return;
        const inputTokens = estimateTokens(systemPrompt) + estimateTokens(task);
        const outputTokens = estimateTokens(result);
        config.budget.record(inputTokens, outputTokens);
      }

      if (background) {
        let timeoutHandle: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Delegate timed out after ${DELEGATE_TIMEOUT_MS / 1000}s`)),
            DELEGATE_TIMEOUT_MS,
          );
          timeoutHandle.unref();
        });

        Promise.race([executeRun(), timeout])
          .finally(() => clearTimeout(timeoutHandle))
          .then((result) => {
            config.runs.complete(run.id, result);
            recordBudget(result);
            config.eventBus?.emit("delegate:done", {
              childRunId: run.id,
              status: "completed",
              result,
            });
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            config.runs.fail(run.id, msg);
            config.eventBus?.emit("delegate:done", {
              childRunId: run.id,
              status: "failed",
              result: null,
            });
          });

        return {
          runId: run.id,
          agent: agentName,
          status: "running",
          message: `Background task started. Use check_run with runId "${run.id}" to get results.`,
        };
      }

      try {
        const result = await executeRun();
        config.runs.complete(run.id, result);
        recordBudget(result);
        config.eventBus?.emit("delegate:done", {
          childRunId: run.id,
          status: "completed",
          result,
        });
        return { result, agent: agentName, runId: run.id };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        config.runs.fail(run.id, msg);
        return { error: `Delegate (${agentName}) failed: ${msg}`, runId: run.id };
      }
    },
  });
}
