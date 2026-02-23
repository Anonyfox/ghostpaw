import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

declare const __VERSION__: string;
const VERSION = __VERSION__;

// ── CLI detection ────────────────────────────────────────────────────────────

function isCLI(): boolean {
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    const invoked = realpathSync(process.argv[1]);
    return self === invoked;
  } catch {
    return false;
  }
}

// ── SQLite bootstrap ─────────────────────────────────────────────────────────

function ensureSqliteFlag(): void {
  if (process.execArgv.includes("--experimental-sqlite")) return;

  const result = spawnSync(
    process.execPath,
    ["--experimental-sqlite", ...process.execArgv, process.argv[1], ...process.argv.slice(2)],
    { stdio: "inherit" },
  );

  process.exit(result.status ?? 1);
}

// ── Public API ──────────────────────────────────────────────────────────────

export type { GhostpawConfig, ProviderConfig, ModelTiers, CostControls } from "./core/config.js";
export { loadConfig, DEFAULT_CONFIG } from "./core/config.js";
export type { ChatFactory, ChatInstance, RunResult, AgentLoopHandle } from "./core/loop.js";
export { createAgentLoop } from "./core/loop.js";
export type { BudgetTracker, TokenUsage } from "./core/cost.js";
export { createBudgetTracker, estimateTokens } from "./core/cost.js";
export type { GhostpawDatabase } from "./core/database.js";
export { createDatabase } from "./core/database.js";
export type { Session, SessionStore, Message, MessageRole } from "./core/session.js";
export { createSessionStore } from "./core/session.js";
export type { MemoryStore, Memory, MemoryMatch, SearchOptions, StoreOptions } from "./core/memory.js";
export { createMemoryStore } from "./core/memory.js";
export type { ToolRegistry } from "./tools/registry.js";
export { createToolRegistry } from "./tools/registry.js";
export { createReadTool } from "./tools/read.js";
export { createWriteTool } from "./tools/write.js";
export { createEditTool } from "./tools/edit.js";
export { createBashTool } from "./tools/bash.js";
export { createWebFetchTool } from "./tools/web.js";
export { createWebSearchTool } from "./tools/search.js";
export type { SearchProvider, SearchResult, SearchResponse } from "./tools/search.js";
export { createDelegateTool } from "./tools/delegate.js";
export { createCheckRunTool } from "./tools/check_run.js";
export type { AgentEventMap, EventBus } from "./core/events.js";
export { createEventBus } from "./core/events.js";
export type { Run, RunStatus, RunStore } from "./core/runs.js";
export { createRunStore } from "./core/runs.js";
export type { AgentProfile } from "./core/agents.js";
export { listAgentProfiles, getAgentProfile } from "./core/agents.js";
export { DEFAULT_SOUL } from "./core/soul.js";
export type { InitResult } from "./core/init.js";
export { initWorkspace } from "./core/init.js";
export { startDaemon } from "./core/daemon.js";
export type { InitSystem, ServiceConfig, ServiceResult, ServiceStatus } from "./core/service.js";
export { detectInitSystem, installService, uninstallService, serviceStatus, serviceLogs } from "./core/service.js";
export { GhostpawError, ConfigError, ValidationError, ToolError, ProviderError, BudgetExceededError, DatabaseError } from "./lib/errors.js";
export type { GhostpawErrorCode } from "./lib/errors.js";
export { Schema, createTool } from "chatoyant";

// ── Agent factory ───────────────────────────────────────────────────────────

export interface AgentOptions {
  workspace?: string;
  model?: string;
}

export interface Agent {
  run(prompt: string): Promise<string>;
  stream(prompt: string): AsyncGenerator<string>;
  sessionId: string;
  tools: import("./tools/registry.js").ToolRegistry;
  memory: import("./core/memory.js").MemoryStore;
  eventBus: import("./core/events.js").EventBus;
  runs: import("./core/runs.js").RunStore;
}

export async function createAgent(options: AgentOptions = {}): Promise<Agent> {
  const workspace = resolve(options.workspace ?? ".");

  const { loadConfig } = await import("./core/config.js");
  const { createDatabase } = await import("./core/database.js");
  const { createSessionStore } = await import("./core/session.js");
  const { createToolRegistry } = await import("./tools/registry.js");
  const { createBudgetTracker } = await import("./core/cost.js");
  const { createAgentLoop } = await import("./core/loop.js");
  const { createReadTool } = await import("./tools/read.js");
  const { createWriteTool } = await import("./tools/write.js");
  const { createEditTool } = await import("./tools/edit.js");
  const { createBashTool } = await import("./tools/bash.js");
  const { createWebFetchTool } = await import("./tools/web.js");
  const { createWebSearchTool } = await import("./tools/search.js");
  const { createDelegateTool } = await import("./tools/delegate.js");
  const { createCheckRunTool } = await import("./tools/check_run.js");
  const { createMemoryStore } = await import("./core/memory.js");
  const { createEventBus } = await import("./core/events.js");
  const { createRunStore } = await import("./core/runs.js");

  const config = await loadConfig(workspace);

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  const sessions = createSessionStore(db);
  const memory = createMemoryStore(db);
  const tools = createToolRegistry();
  const eventBus = createEventBus();
  const runStore = createRunStore(db);

  tools.register(createReadTool(workspace));
  tools.register(createWriteTool(workspace));
  tools.register(createEditTool(workspace));
  tools.register(createBashTool(workspace));
  tools.register(createWebFetchTool(workspace));
  tools.register(createWebSearchTool());

  const budget = createBudgetTracker(config.costControls);
  const model = options.model ?? config.models.default;

  const session = sessions.createSession(`agent-${Date.now()}`, { model });

  const coreTools = tools.list();
  tools.register(
    createDelegateTool({
      workspacePath: workspace,
      tools: coreTools,
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

  return {
    sessionId: session.id,
    tools,
    memory,
    eventBus,
    runs: runStore,
    async run(prompt: string): Promise<string> {
      const result = await loop.run(session.id, prompt);
      return result.text ?? "(no response)";
    },
    async *stream(prompt: string): AsyncGenerator<string> {
      yield* loop.stream(session.id, prompt);
    },
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(
    `
ghostpaw v${VERSION} — single-file AI agent runtime

Usage: ghostpaw [command] [options]

Commands:
  (default)                  daemon (headless) or chat (TTY)
  run <prompt>               One-shot prompt, exits when done
  init                       Scaffold workspace (SOUL.md, config.json, etc.)
  service install            Register as OS service (auto-start + restart)
  service uninstall          Remove OS service
  service status             Check if running
  service logs               Tail service logs
  telegram                   Start Telegram bot

Options:
  -h, --help        Show this help
  -v, --version     Show version
  -w, --workspace   Workspace directory (default: .)
  -m, --model       Model to use (default: from config)
`.trim(),
  );
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: false,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      workspace: { type: "string", short: "w", default: "." },
      model: { type: "string", short: "m" },
    },
  });

  if (values.version) {
    console.log(VERSION);
    return;
  }

  if (values.help) {
    printHelp();
    return;
  }

  const command = positionals[0];
  const workspace = resolve(values.workspace as string);

  switch (command) {
    case undefined: {
      const isTTY = process.stdin.isTTY && process.stdout.isTTY;
      if (isTTY) {
        console.log("ghostpaw interactive chat — not yet implemented");
      } else {
        const { startDaemon } = await import("./core/daemon.js");
        await startDaemon(workspace);
      }
      break;
    }
    case "run": {
      const prompt = positionals.slice(1).join(" ");
      if (!prompt) {
        console.error('Usage: ghostpaw run "your prompt here"');
        process.exit(1);
      }
      const agent = await createAgent({
        workspace: values.workspace as string,
        model: values.model as string | undefined,
      });
      const result = await agent.run(prompt);
      console.log(result);
      break;
    }
    case "init": {
      const { initWorkspace } = await import("./core/init.js");
      const result = initWorkspace(workspace);
      for (const path of result.created) console.log(`  created  ${path}`);
      for (const path of result.skipped) console.log(`  exists   ${path}`);
      console.log(`\nWorkspace initialized at ${workspace}`);
      break;
    }
    case "service": {
      const sub = positionals[1];
      const { installService, uninstallService, serviceStatus, serviceLogs } = await import(
        "./core/service.js"
      );
      switch (sub) {
        case "install": {
          const config = {
            workspace,
            nodePath: process.execPath,
            ghostpawPath: realpathSync(process.argv[1]),
          };
          const r = installService(config);
          console.log(`[${r.initSystem}] ${r.message}`);
          if (r.path) console.log(`  → ${r.path}`);
          if (!r.success) process.exit(1);
          break;
        }
        case "uninstall": {
          const r = uninstallService(workspace);
          console.log(`[${r.initSystem}] ${r.message}`);
          break;
        }
        case "status": {
          const s = serviceStatus(workspace);
          console.log(`init system: ${s.initSystem}`);
          console.log(`installed:   ${s.installed}`);
          console.log(`running:     ${s.running}`);
          if (s.pid) console.log(`pid:         ${s.pid}`);
          break;
        }
        case "logs":
          await serviceLogs(workspace);
          break;
        default:
          console.error(`Unknown service command: ${sub ?? "(none)"}`);
          console.error("Usage: ghostpaw service install|uninstall|status|logs");
          process.exit(1);
      }
      break;
    }
    case "telegram":
      console.log("ghostpaw telegram bot — not yet implemented");
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

if (isCLI()) {
  ensureSqliteFlag();
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`fatal: ${msg}`);
    process.exit(1);
  });
}
