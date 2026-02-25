import { Chat, createTool, Schema, type Tool } from "chatoyant";
import { getAgentProfile, listAgentProfiles } from "../core/agents.js";
import { assembleSystemPrompt } from "../core/context.js";
import { type BudgetTracker, estimateTokens } from "../core/cost.js";
import type { CostGuard } from "../core/cost-guard.js";
import type { EventBus } from "../core/events.js";
import type { ChatInstance } from "../core/loop.js";
import type { RunStore } from "../core/runs.js";
import type { SessionStore } from "../core/session.js";
import { SpendLimitError } from "../lib/errors.js";

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
  parentSessionId: string | (() => string);
  chatFactory?: (model: string) => ChatInstance;
  eventBus?: EventBus;
  budget?: BudgetTracker;
  costGuard?: CostGuard;
}

function resolveParentSessionId(config: DelegateConfig): string {
  return typeof config.parentSessionId === "function"
    ? config.parentSessionId()
    : config.parentSessionId;
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

      const available = listAgentProfiles(config.workspacePath);
      const profile =
        agentName !== "default" ? getAgentProfile(config.workspacePath, agentName) : null;
      if (agentName !== "default" && !profile) {
        return {
          error: `Unknown agent "${agentName}". Available: ${available.join(", ") || "none"}`,
        };
      }

      if (config.costGuard?.isBlocked()) {
        const s = config.costGuard.status();
        throw new SpendLimitError(s.spent, s.limit);
      }

      const systemPrompt = assembleSystemPrompt(
        config.workspacePath,
        null,
        profile?.systemPrompt ?? null,
      );

      const parentId = resolveParentSessionId(config);

      const run = config.runs.create({
        sessionId: parentId,
        prompt: task,
        agentProfile: agentName,
        parentSessionId: parentId,
        model: resolvedModel,
      });

      config.eventBus?.emit("delegate:spawn", {
        parentSessionId: parentId,
        childRunId: run.id,
        agent: agentName,
      });

      function executeRun(): { chat: ChatInstance; promise: Promise<string> } {
        const chat = createChat(resolvedModel);
        chat.system(systemPrompt);
        for (const tool of safeTools) chat.addTool(tool);
        const promise = chat.user(task).generate({
          maxIterations: DELEGATE_MAX_ITERATIONS,
          onToolError: "respond",
        });
        return { chat, promise };
      }

      function persistConversation(chat: ChatInstance, resultText: string) {
        const childSession = config.sessions.createSession(`delegate-${Date.now()}`, {
          model: resolvedModel,
          purpose: "delegate",
        });

        const lr = chat.lastResult;
        const tokensIn =
          lr?.usage.inputTokens ?? estimateTokens(systemPrompt) + estimateTokens(task);
        const tokensOut = lr?.usage.outputTokens ?? estimateTokens(resultText);

        if (chat.messages) {
          const persistRoles = new Set(["system", "user", "assistant"]);
          let lastAssistantIdx = -1;
          for (let i = chat.messages.length - 1; i >= 0; i--) {
            if (chat.messages[i]!.role === "assistant") {
              lastAssistantIdx = i;
              break;
            }
          }
          let lastMsgId: string | undefined;
          for (let i = 0; i < chat.messages.length; i++) {
            const msg = chat.messages[i]!;
            if (!persistRoles.has(msg.role)) continue;
            const isLastAssistant = i === lastAssistantIdx;
            const added = config.sessions.addMessage(childSession.id, {
              role: msg.role as "system" | "user" | "assistant",
              content: msg.content || null,
              parentId: lastMsgId,
              model: msg.role === "assistant" ? (lr?.model ?? resolvedModel) : undefined,
              tokensIn: isLastAssistant ? tokensIn : undefined,
              tokensOut: isLastAssistant ? tokensOut : undefined,
            });
            lastMsgId = added.id;
          }
        }

        if (lr) {
          config.runs.recordUsage(run.id, lr.model, tokensIn, tokensOut, lr.cost.estimatedUsd);
        }

        const costUsd = lr?.cost.estimatedUsd ?? 0;
        config.runs.linkChildSession(run.id, childSession.id);
        config.sessions.updateSessionTokens(childSession.id, tokensIn, tokensOut, costUsd);
        config.budget?.record(tokensIn, tokensOut);
      }

      function withTimeout<T>(promise: Promise<T>): Promise<T> {
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
        const { chat, promise } = executeRun();
        withTimeout(promise)
          .then((result) => {
            config.runs.complete(run.id, result);
            persistConversation(chat, result);
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
        const { chat, promise } = executeRun();
        const result = await withTimeout(promise);
        config.runs.complete(run.id, result);
        persistConversation(chat, result);
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
