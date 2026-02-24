import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { style } from "./lib/terminal.js";

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

function suppressExperimentalWarning(): void {
  const originalEmit = process.emit.bind(process);
  process.emit = ((event: string, ...args: unknown[]) => {
    if (event === "warning" && (args[0] as { name?: string })?.name === "ExperimentalWarning") {
      return false;
    }
    return originalEmit(event, ...args);
  }) as typeof process.emit;
}

function ensureSqliteFlag(): void {
  suppressExperimentalWarning();

  if (process.execArgv.includes("--experimental-sqlite")) return;

  const result = spawnSync(
    process.execPath,
    ["--experimental-sqlite", ...process.execArgv, process.argv[1], ...process.argv.slice(2)],
    { stdio: "inherit" },
  );

  process.exit(result.status ?? 1);
}

// ── Public API ──────────────────────────────────────────────────────────────

export { createTool, Schema } from "chatoyant";
export type { AgentProfile } from "./core/agents.js";
export { getAgentProfile, listAgentProfiles } from "./core/agents.js";
export type { CostControls, GhostpawConfig, ModelTiers } from "./core/config.js";
export { DEFAULT_CONFIG, loadConfig } from "./core/config.js";
export type { BudgetTracker, TokenUsage } from "./core/cost.js";
export { createBudgetTracker, estimateTokens } from "./core/cost.js";
export { startDaemon } from "./core/daemon.js";
export type { GhostpawDatabase } from "./core/database.js";
export { createDatabase } from "./core/database.js";
export type { AgentEventMap, EventBus } from "./core/events.js";
export { createEventBus } from "./core/events.js";
export type { InitResult } from "./core/init.js";
export { ensureWorkspace, initWorkspace } from "./core/init.js";
export type { AgentLoopHandle, ChatFactory, ChatInstance, RunResult } from "./core/loop.js";
export { createAgentLoop } from "./core/loop.js";
export type {
  Memory,
  MemoryMatch,
  MemoryStore,
  SearchOptions,
  StoreOptions,
} from "./core/memory.js";
export { createMemoryStore } from "./core/memory.js";
export type { AbsorbConfig, AbsorbResult } from "./core/absorb.js";
export { absorbSessions, countUnabsorbedSessions } from "./core/absorb.js";
export type { ScoutResult, ScoutTrail } from "./core/scout.js";
export { runScout, scout } from "./core/scout.js";
export type { ReflectChange, ReflectResult, TrainChange, TrainResult } from "./core/reflect.js";
export { printReflectReport, printTrainReport, reflect, runReflect, runTrain, train } from "./core/reflect.js";
export { startRepl } from "./core/repl.js";
export type { Run, RunStatus, RunStore } from "./core/runs.js";
export { createRunStore } from "./core/runs.js";
export type { SecretStore } from "./core/secrets.js";
export { createSecretStore } from "./core/secrets.js";
export type { InitSystem, ServiceConfig, ServiceResult, ServiceStatus } from "./core/service.js";
export {
  detectInitSystem,
  installService,
  serviceLogs,
  serviceStatus,
  uninstallService,
} from "./core/service.js";
export type { Message, MessageRole, Session, SessionStore } from "./core/session.js";
export { createSessionStore } from "./core/session.js";
export { DEFAULT_SOUL } from "./core/soul.js";
export { StreamFormatter } from "./core/stream_format.js";
export type { EmbeddingProvider } from "./lib/embedding.js";
export { createEmbeddingProvider } from "./lib/embedding.js";
export type { GhostpawErrorCode } from "./lib/errors.js";
export {
  commitSkills,
  diffSkills as diffSkillHistory,
  getAllSkillRanks,
  getGitFlags as getSkillHistoryFlags,
  getSkillLog,
  getSkillRank,
  hasHistory as hasSkillHistory,
  initHistory as initSkillHistory,
  isGitAvailable,
} from "./lib/skill-history.js";
export { banner, blank, label, log, style } from "./lib/terminal.js";
export {
  BudgetExceededError,
  ConfigError,
  DatabaseError,
  GhostpawError,
  ProviderError,
  ToolError,
  ValidationError,
} from "./lib/errors.js";
export { createBashTool } from "./tools/bash.js";
export { createCheckRunTool } from "./tools/check_run.js";
export { createDelegateTool } from "./tools/delegate.js";
export { createEditTool } from "./tools/edit.js";
export type { MemoryToolConfig } from "./tools/memory.js";
export { createMemoryTool } from "./tools/memory.js";
export { createReadTool } from "./tools/read.js";
export type { ToolRegistry } from "./tools/registry.js";
export { createToolRegistry } from "./tools/registry.js";
export type { SearchProvider, SearchResponse, SearchResult } from "./tools/search.js";
export { createWebSearchTool } from "./tools/search.js";
export { createSecretsTool } from "./tools/secrets.js";
export { createSkillsTool } from "./tools/skills.js";
export { createWebFetchTool } from "./tools/web.js";
export { createWriteTool } from "./tools/write.js";

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
  const { createSecretStore } = await import("./core/secrets.js");
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
  const { createSecretsTool } = await import("./tools/secrets.js");
  const { createMemoryTool } = await import("./tools/memory.js");
  const { createSkillsTool } = await import("./tools/skills.js");
  const { createMemoryStore } = await import("./core/memory.js");
  const { createEmbeddingProvider } = await import("./lib/embedding.js");
  const { createEventBus } = await import("./core/events.js");
  const { createRunStore } = await import("./core/runs.js");

  const dbPath = resolve(workspace, "ghostpaw.db");
  const db = await createDatabase(dbPath);

  // Secrets: load from DB into env, then sync shell overrides back
  const secrets = createSecretStore(db);
  secrets.loadIntoEnv();
  secrets.syncProviderKeys();

  const config = await loadConfig(workspace);

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
  tools.register(createSecretsTool(secrets));
  tools.register(createMemoryTool({ memory, sessions, embedding: createEmbeddingProvider() }));
  tools.register(createSkillsTool({ workspacePath: workspace, sessions, memory }));

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
  const h = style.bold;
  const d = style.dim;
  console.log(`
${h("ghostpaw")} ${d(`v${VERSION}`)} — single-file AI agent runtime

${h("Usage")}
  ghostpaw ${d("[command] [options]")}

${h("Commands")}
  ${d("(default)")}        Interactive chat ${d("(TTY)")} or daemon ${d("(headless)")}
  run ${d("<prompt>")}      One-shot prompt, exits when done
  train             Review recent experience, level up skills
  scout ${d("[direction]")}  Explore new skill possibilities
  init              Re-scaffold workspace ${d("(auto-runs on first use)")}
  service ${d("<sub>")}     install | uninstall | status | logs

${h("Options")}
  -w, --workspace   Workspace directory ${d("(default: .)")}
  -m, --model       Model override ${d("(default: from config)")}
  -h, --help        Show this help
  -v, --version     Show version`);
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
      const { ensureWorkspace } = await import("./core/init.js");
      await ensureWorkspace(workspace);
      const isTTY = process.stdin.isTTY && process.stdout.isTTY;
      if (isTTY) {
        const { startRepl } = await import("./core/repl.js");
        await startRepl(workspace);
      } else {
        const { startDaemon } = await import("./core/daemon.js");
        await startDaemon(workspace);
      }
      break;
    }
    case "run": {
      const prompt = positionals.slice(1).join(" ");
      if (!prompt) {
        console.error(`Usage: ghostpaw run ${style.dim('"your prompt here"')}`);
        process.exit(1);
      }
      const { ensureWorkspace } = await import("./core/init.js");
      await ensureWorkspace(workspace);
      const agent = await createAgent({
        workspace: values.workspace as string,
        model: values.model as string | undefined,
      });
      const result = await agent.run(prompt);
      console.log(result);
      break;
    }
    case "train": {
      const { ensureWorkspace } = await import("./core/init.js");
      await ensureWorkspace(workspace);
      const { train } = await import("./core/reflect.js");
      await train(workspace, { stream: process.stdout.isTTY === true });
      break;
    }
    case "scout": {
      const { ensureWorkspace } = await import("./core/init.js");
      await ensureWorkspace(workspace);
      const { scout } = await import("./core/scout.js");
      const direction = positionals.slice(1).join(" ").trim() || undefined;
      await scout(workspace, { stream: process.stdout.isTTY === true, direction });
      break;
    }
    case "init": {
      const { initWorkspace, promptApiKey } = await import("./core/init.js");
      const { log, blank } = await import("./lib/terminal.js");
      blank();
      const result = initWorkspace(workspace);
      for (const p of result.created) log.created(p);
      for (const p of result.skipped) log.exists(p);
      blank();
      log.done(`Workspace ready at ${style.dim(workspace)}`);
      await promptApiKey(workspace);
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
    default: {
      const { log } = await import("./lib/terminal.js");
      log.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
    }
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
