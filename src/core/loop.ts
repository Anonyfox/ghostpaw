import { Chat, type Tool } from "chatoyant";
import type { ToolRegistry } from "../tools/registry.js";
import { compactMessages, shouldCompact } from "./compaction.js";
import { assembleSystemPrompt } from "./context.js";
import { type BudgetTracker, estimateTokens } from "./cost.js";
import type { EventBus } from "./events.js";
import type { RunStore } from "./runs.js";
import type { SessionStore } from "./session.js";

export interface ChatInstance {
  system(content: string): ChatInstance;
  user(content: string): ChatInstance;
  assistant(content: string): ChatInstance;
  addTool(tool: Tool): void;
  generate(options?: {
    maxIterations?: number;
    onToolError?: string;
    toolTimeout?: number;
  }): Promise<string>;
  stream?(options?: {
    maxIterations?: number;
    onToolError?: string;
    toolTimeout?: number;
  }): AsyncIterable<string>;
}

export type ChatFactory = (model: string) => ChatInstance;

const defaultChatFactory: ChatFactory = (model: string) => new Chat({ model }) as ChatInstance;

export interface RunResult {
  text: string | null;
  budgetExceeded: boolean;
}

export interface AgentLoopConfig {
  model: string;
  sessions: SessionStore;
  tools: ToolRegistry;
  budget: BudgetTracker;
  workspacePath: string;
  maxIterations?: number;
  chatFactory?: ChatFactory;
  compactFn?: (prompt: string) => Promise<string>;
  compactionThreshold?: number;
  eventBus?: EventBus;
  runs?: RunStore;
}

export interface AgentLoopHandle {
  run(sessionId: string, prompt: string): Promise<RunResult>;
  stream(sessionId: string, prompt: string): AsyncGenerator<string, RunResult>;
}

const DEFAULT_MAX_ITERATIONS = 20;
const DEFAULT_COMPACTION_THRESHOLD = 150_000;
const TOOL_TIMEOUT_MS = 10 * 60 * 1000;

export function createAgentLoop(config: AgentLoopConfig): AgentLoopHandle {
  const {
    model,
    sessions,
    tools,
    budget,
    workspacePath,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    chatFactory = defaultChatFactory,
    compactFn,
    compactionThreshold = DEFAULT_COMPACTION_THRESHOLD,
    eventBus,
    runs,
  } = config;

  const sessionLocks = new Map<string, Promise<void>>();

  async function withLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    const prev = sessionLocks.get(sessionId) ?? Promise.resolve();
    let releaseLock!: () => void;
    const next = new Promise<void>((r) => {
      releaseLock = r;
    });
    sessionLocks.set(sessionId, next);
    await prev;
    try {
      return await fn();
    } finally {
      releaseLock();
      if (sessionLocks.get(sessionId) === next) sessionLocks.delete(sessionId);
    }
  }

  interface PrepareResult {
    chat: ChatInstance;
    inputTokenEstimate: number;
    lastMessageId: string | undefined;
  }

  async function prepare(sessionId: string, prompt: string): Promise<PrepareResult> {
    const currentSession = sessions.getSession(sessionId);
    const parentId = currentSession?.headMessageId ?? undefined;
    sessions.addMessage(sessionId, { role: "user", content: prompt, parentId });

    let history = sessions.getConversationHistory(sessionId);

    if (compactFn && shouldCompact(history, compactionThreshold)) {
      const compactionPrompt = compactMessages(history);
      const summary = await compactFn(compactionPrompt);
      sessions.addMessage(sessionId, {
        role: "assistant",
        content: summary,
        parentId: history.at(-1)?.id,
        isCompaction: true,
      });
      history = sessions.getConversationHistory(sessionId);
    }

    let systemPrompt = assembleSystemPrompt(
      workspacePath,
      budget.getUsage().isWarning ? budget.formatSummary() : null,
    );

    if (runs) {
      const completed = runs.getCompletedDelegations(sessionId);
      if (completed.length > 0) {
        const notes = completed.map(
          (r) => `- **${r.agentProfile}**: ${r.result?.slice(0, 500) ?? "(no result)"}`,
        );
        systemPrompt += `\n\n## Completed Background Tasks\n\n${notes.join("\n")}`;
        for (const r of completed) runs.markAnnounced(r.id);
      }
    }

    const chat = chatFactory(model);
    chat.system(systemPrompt);

    let inputTokenEstimate = estimateTokens(systemPrompt);
    for (const msg of history) {
      inputTokenEstimate += estimateTokens(msg.content ?? "");
      if (msg.role === "user") chat.user(msg.content ?? "");
      else if (msg.role === "assistant") chat.assistant(msg.content ?? "");
    }

    for (const tool of tools.list()) {
      chat.addTool(tool);
    }

    const lastMessageId = sessions.getSession(sessionId)?.headMessageId ?? undefined;
    return { chat, inputTokenEstimate, lastMessageId };
  }

  function finalize(
    sessionId: string,
    text: string | null,
    inputTokenEstimate: number,
    lastMessageId: string | undefined,
  ): RunResult {
    sessions.addMessage(sessionId, {
      role: "assistant",
      content: text,
      parentId: lastMessageId,
      model,
    });

    const outputTokens = estimateTokens(text ?? "");
    budget.record(inputTokenEstimate, outputTokens);
    sessions.updateSessionTokens(sessionId, inputTokenEstimate, outputTokens);

    let budgetExceeded = false;
    try {
      budget.checkBudget();
    } catch {
      budgetExceeded = true;
    }

    return { text, budgetExceeded };
  }

  function beginRun(sessionId: string, prompt: string): string | undefined {
    const runRecord = runs?.create({ sessionId, prompt, agentProfile: "default" });
    eventBus?.emit("run:start", {
      runId: runRecord?.id ?? "",
      sessionId,
      agent: "default",
      prompt,
    });
    return runRecord?.id;
  }

  function completeRun(
    sessionId: string,
    runId: string | undefined,
    text: string | null,
    inputTokenEstimate: number,
    lastMessageId: string | undefined,
    error?: string,
  ): RunResult {
    if (error) {
      if (runId) runs?.fail(runId, error);
      eventBus?.emit("run:error", { runId: runId ?? "", sessionId, error });
    }

    const result = finalize(sessionId, text, inputTokenEstimate, lastMessageId);

    if (!error && runId) {
      const current = runs?.get(runId);
      if (current?.status === "running") runs?.complete(runId, text ?? "");
    }

    eventBus?.emit("run:end", { runId: runId ?? "", sessionId, text });
    return result;
  }

  async function run(sessionId: string, prompt: string): Promise<RunResult> {
    return withLock(sessionId, async () => {
      const runId = beginRun(sessionId, prompt);
      const { chat, inputTokenEstimate, lastMessageId } = await prepare(sessionId, prompt);

      let text: string | null = null;
      let error: string | undefined;
      try {
        text = await chat.generate({
          maxIterations,
          onToolError: "respond",
          toolTimeout: TOOL_TIMEOUT_MS,
        });
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        text = `Error: ${error}`;
      }

      return completeRun(sessionId, runId, text, inputTokenEstimate, lastMessageId, error);
    });
  }

  async function* stream(sessionId: string, prompt: string): AsyncGenerator<string, RunResult> {
    const prev = sessionLocks.get(sessionId) ?? Promise.resolve();
    let releaseLock!: () => void;
    const next = new Promise<void>((r) => {
      releaseLock = r;
    });
    sessionLocks.set(sessionId, next);
    await prev;

    try {
      const runId = beginRun(sessionId, prompt);
      const { chat, inputTokenEstimate, lastMessageId } = await prepare(sessionId, prompt);

      if (!chat.stream) {
        let text: string | null = null;
        let error: string | undefined;
        try {
          text = await chat.generate({
            maxIterations,
            onToolError: "respond",
            toolTimeout: TOOL_TIMEOUT_MS,
          });
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          text = `Error: ${error}`;
        }
        return completeRun(sessionId, runId, text, inputTokenEstimate, lastMessageId, error);
      }

      let fullText = "";
      let error: string | undefined;
      try {
        for await (const chunk of chat.stream({
          maxIterations,
          onToolError: "respond",
          toolTimeout: TOOL_TIMEOUT_MS,
        })) {
          fullText += chunk;
          eventBus?.emit("stream:chunk", { sessionId, chunk });
          yield chunk;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        if (!fullText) fullText = `Error: ${error}`;
      }

      return completeRun(
        sessionId,
        runId,
        fullText || null,
        inputTokenEstimate,
        lastMessageId,
        error,
      );
    } finally {
      releaseLock();
      if (sessionLocks.get(sessionId) === next) sessionLocks.delete(sessionId);
    }
  }

  return { run, stream };
}
