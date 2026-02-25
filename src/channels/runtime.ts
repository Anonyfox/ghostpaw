import { resolve } from "node:path";
import type { Tool } from "chatoyant";
import type { EventBus } from "../core/events.js";
import type { AgentLoopHandle } from "../core/loop.js";
import type { MemoryStore } from "../core/memory.js";
import type { SecretStore } from "../core/secrets.js";
import type { SessionStore } from "../core/session.js";
import type { ToolRegistry } from "../tools/registry.js";

// ── Public types ─────────────────────────────────────────────────────────────

export interface ChannelAdapter {
  readonly name: string;
  start(): Promise<unknown>;
  stop(): Promise<void>;
}

export interface ChannelRuntime {
  readonly workspace: string;
  model: string;
  readonly sessions: SessionStore;
  readonly memory: MemoryStore;
  readonly eventBus: EventBus;
  readonly secrets: SecretStore;
  setModel(newModel: string): void;
  run(sessionKey: string, text: string): Promise<string>;
  stream(sessionKey: string, text: string): AsyncGenerator<string>;
  stop(): void;
}

export interface ChannelRuntimeConfig {
  workspace: string;
  model?: string;
}

// ── Session entry ────────────────────────────────────────────────────────────

interface SessionEntry {
  sessionId: string;
  loop: AgentLoopHandle;
  tools: ToolRegistry;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export async function createChannelRuntime(config: ChannelRuntimeConfig): Promise<ChannelRuntime> {
  const workspace = resolve(config.workspace);

  const { loadConfig } = await import("../core/config.js");
  const { createDatabase } = await import("../core/database.js");
  const { createSecretStore } = await import("../core/secrets.js");
  const { createSessionStore } = await import("../core/session.js");
  const { createToolRegistry } = await import("../tools/registry.js");
  const { createBudgetTracker } = await import("../core/cost.js");
  const { createAgentLoop } = await import("../core/loop.js");
  const { createReadTool } = await import("../tools/read.js");
  const { createWriteTool } = await import("../tools/write.js");
  const { createEditTool } = await import("../tools/edit.js");
  const { createBashTool } = await import("../tools/bash.js");
  const { createWebFetchTool } = await import("../tools/web.js");
  const { createWebSearchTool } = await import("../tools/search.js");
  const { createDelegateTool } = await import("../tools/delegate.js");
  const { createCheckRunTool } = await import("../tools/check_run.js");
  const { createSecretsTool } = await import("../tools/secrets.js");
  const { createMemoryTool } = await import("../tools/memory.js");
  const { createSkillsTool } = await import("../tools/skills.js");
  const { createMemoryStore } = await import("../core/memory.js");
  const { createEmbeddingProvider } = await import("../lib/embedding.js");
  const { createEventBus } = await import("../core/events.js");
  const { createRunStore } = await import("../core/runs.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  const secrets = createSecretStore(db);
  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const ghostpawConfig = await loadConfig(workspace);
  let model = config.model ?? ghostpawConfig.models.default;

  const sessions = createSessionStore(db);
  const memory = createMemoryStore(db);
  const eventBus = createEventBus();
  const runStore = createRunStore(db);
  const budget = createBudgetTracker(ghostpawConfig.costControls);
  const embedding = createEmbeddingProvider();

  const baseTools: Tool[] = [
    createReadTool(workspace),
    createWriteTool(workspace),
    createEditTool(workspace),
    createBashTool(workspace),
    createWebFetchTool(workspace),
    createWebSearchTool(),
    createSecretsTool(secrets),
    createMemoryTool({ memory, sessions, embedding }),
    createSkillsTool({ workspacePath: workspace, sessions, memory }),
  ];

  const { createMcpTool } = await import("../tools/mcp.js");
  const { tool: mcpTool, shutdown: mcpShutdown } = createMcpTool({
    resolveSecret: (name) => secrets.get(name) ?? process.env[name] ?? null,
  });
  baseTools.push(mcpTool);

  // ── Per-session cache ────────────────────────────────────────────────────

  const entries = new Map<string, SessionEntry>();

  // ── Background delegation auto-resume ───────────────────────────────────

  eventBus.on("delegate:done", (data) => {
    if (data.status !== "completed" && data.status !== "failed") return;
    const run = runStore.get(data.childRunId);
    if (!run?.parentSessionId || run.announced) return;

    let parentKey: string | undefined;
    let parentEntry: SessionEntry | undefined;
    for (const [key, entry] of entries) {
      if (entry.sessionId === run.parentSessionId) {
        parentKey = key;
        parentEntry = entry;
        break;
      }
    }
    if (!parentEntry || !parentKey) return;

    const verb = data.status === "completed" ? "completed" : "failed";
    const prompt = `[System: Background delegation by "${run.agentProfile}" ${verb}. Check the completed tasks in your context and report the result to the user.]`;

    parentEntry.loop
      .run(parentEntry.sessionId, prompt)
      .then((result) => {
        eventBus.emit("delegate:auto-result", {
          sessionId: parentEntry.sessionId,
          sessionKey: parentKey,
          agent: run.agentProfile,
          text: result.text,
        });
      })
      .catch(() => {});
  });

  function resolveSession(sessionKey: string): SessionEntry {
    const existing = entries.get(sessionKey);
    if (existing) return existing;

    const session =
      sessions.getSessionByKey(sessionKey) ??
      sessions.createSession(sessionKey, { model, purpose: "chat" });

    const tools = createToolRegistry();
    for (const t of baseTools) tools.register(t);

    const coreToolList = tools.list();
    tools.register(
      createDelegateTool({
        workspacePath: workspace,
        tools: coreToolList,
        defaultModel: model,
        sessions,
        runs: runStore,
        parentSessionId: session.id,
        eventBus,
        budget,
      }),
    );
    tools.register(createCheckRunTool(runStore));

    const loop = createAgentLoop({
      model,
      sessions,
      tools,
      budget,
      workspacePath: workspace,
      eventBus,
      runs: runStore,
    });

    const entry: SessionEntry = { sessionId: session.id, loop, tools };
    entries.set(sessionKey, entry);
    return entry;
  }

  // ── Public interface ─────────────────────────────────────────────────────

  return {
    workspace,
    get model() {
      return model;
    },
    set model(v: string) {
      model = v;
    },
    sessions,
    memory,
    eventBus,
    secrets,

    setModel(newModel: string): void {
      model = newModel;
      entries.clear();
      ghostpawConfig.models.default = newModel;
    },

    async run(sessionKey: string, text: string): Promise<string> {
      const { sessionId, loop } = resolveSession(sessionKey);
      const result = await loop.run(sessionId, text);
      return result.text ?? "(no response)";
    },

    async *stream(sessionKey: string, text: string): AsyncGenerator<string> {
      const { sessionId, loop } = resolveSession(sessionKey);
      yield* loop.stream(sessionId, text);
    },

    stop(): void {
      entries.clear();
      mcpShutdown().catch(() => {});
      db.close();
    },
  };
}
