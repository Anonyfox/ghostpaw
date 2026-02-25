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
      "If true, run asynchronously and return immediately. Results are delivered automatically when done.",
    optional: true,
  });
  model = Schema.String({
    description: "Model override (default: same as parent)",
    optional: true,
  });
  timeout = Schema.Number({
    description: "Max seconds to wait (default: 1800). Increase for complex multi-step tasks.",
    optional: true,
  });
}

const DELEGATE_MAX_ITERATIONS = 15;
const DELEGATE_DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
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
  const createChat = config.chatFactory ?? ((model: string) => new Chat({ model }) as ChatInstance);

  const safeTools = config.tools.filter((t) => !DELEGATE_CIRCUIT_BREAKER.has(t.name));

  return createTool({
    name: "delegate",
    description: (() => {
      const available = listAgentProfiles(config.workspacePath);
      const base =
        "Delegate a task to a specialist agent. Agents cannot delegate further (no recursion).";
      if (available.length === 0) return base;
      return `${base} Available: ${available.join(", ")}. MUST be used for any coding/scripting task when a specialist exists.`;
    })(),
    // biome-ignore lint: TS index-signature limitation on class instances vs SchemaInstance
    parameters: new DelegateParams() as any,
    execute: async ({ args }) => {
      const {
        task,
        agent,
        background,
        model,
        timeout: timeoutSec,
      } = args as {
        task: string;
        agent?: string;
        background?: boolean;
        model?: string;
        timeout?: number;
      };

      const effectiveTimeoutMs =
        timeoutSec && timeoutSec > 0 ? timeoutSec * 1000 : DELEGATE_DEFAULT_TIMEOUT_MS;

      const agentName = agent || "default";
      const resolvedModel = model || config.defaultModel;

      // Dynamic profile discovery at execution time
      const available = listAgentProfiles(config.workspacePath);
      const profile =
        agentName !== "default" ? getAgentProfile(config.workspacePath, agentName) : null;
      if (agentName !== "default" && !profile) {
        return {
          error: `Unknown agent "${agentName}". Available: ${available.join(", ") || "none"}`,
        };
      }

      const systemPrompt = assembleSystemPrompt(
        config.workspacePath,
        null,
        profile?.systemPrompt ?? null,
      );

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

      function withTimeout(promise: Promise<string>): Promise<string> {
        let timeoutHandle: ReturnType<typeof setTimeout>;
        const deadline = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error(`Delegate timed out after ${effectiveTimeoutMs / 1000}s`)),
            effectiveTimeoutMs,
          );
          timeoutHandle.unref();
        });
        return Promise.race([promise, deadline]).finally(() => clearTimeout(timeoutHandle));
      }

      if (background) {
        withTimeout(executeRun())
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
          message: `Background task started. Results will be delivered automatically when done.`,
        };
      }

      try {
        const result = await withTimeout(executeRun());
        config.runs.complete(run.id, result);
        recordBudget(result);
        config.eventBus?.emit("delegate:done", {
          childRunId: run.id,
          status: "completed",
          result,
        });
        return `[${agentName} completed successfully]\n\n${result}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        config.runs.fail(run.id, msg);
        return {
          status: "failed",
          agent: agentName,
          runId: run.id,
          error: msg,
        };
      }
    },
  });
}
