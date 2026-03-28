import "./lib/suppress_warnings.ts";
import { defineCommand, runMain } from "citty";
import { createAgent } from "./agent.ts";
import { executeRun } from "./channels/cli/run.ts";
import { runTui } from "./channels/tui/tui.ts";
import type { InterceptorContext } from "./core/chat/turn.ts";
import { registerScribeSubsystem } from "./core/scribe/register.ts";
import { registerBuiltins } from "./core/commands/builtins.ts";
import { createRegistry } from "./core/commands/registry.ts";
import type { Config } from "./core/config/config.ts";
import {
  applyApiKeys,
  applyModels,
  ensureApiKey,
  readConfig,
  resolveModel,
} from "./core/config/config.ts";
import { openDatabase } from "./core/db/open.ts";
import { openCodexDatabase } from "./core/db/open_codex.ts";
import { createSubsystemRegistry } from "./core/interceptor/registry.ts";
import { createDeflectionTools } from "./core/interceptor/self_call.ts";
import { createTools } from "./core/tools/index.ts";
import { ensureHome, resolveHome } from "./home.ts";
import type { DatabaseHandle } from "./lib/database_handle.ts";
import { VERSION } from "./lib/version.ts";

function initShared(args: Record<string, unknown>) {
  const homePath = resolveHome({ home: args.home as string | undefined });
  ensureHome(homePath);
  const config = readConfig(homePath);
  applyApiKeys(config);
  applyModels(config);
  config.model = resolveModel(config);
  const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();
  return { homePath, config, workspace };
}

function buildInterceptorContext(config: Config, codexDb: DatabaseHandle): InterceptorContext {
  const registry = createSubsystemRegistry();
  registerScribeSubsystem(registry);
  const subsystemDbs = new Map<string, DatabaseHandle>();
  subsystemDbs.set("scribe", codexDb);
  return { registry, config: config.interceptor, subsystemDbs };
}

const runCommand = defineCommand({
  meta: { name: "run", description: "Run a single turn against the LLM" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    workspace: { type: "string", description: "Working directory" },
    prompt: { type: "positional", description: "The prompt to send", required: false },
    session: { type: "string", alias: "s", description: "Continue session by ID" },
    model: { type: "string", alias: "m", description: "Override model" },
    "no-stream": { type: "boolean", description: "Wait for full response", default: false },
  },
  async run({ args }) {
    const { homePath, config, workspace } = initShared(args);
    if (!ensureApiKey(config, homePath)) process.exit(1);

    const db = await openDatabase(homePath);
    const codexDb = await openCodexDatabase(homePath);
    const scrubValues = Object.values(config.api_keys).filter(Boolean);
    const interceptorCtx = buildInterceptorContext(config, codexDb);
    const tools = [
      ...createTools(workspace, scrubValues),
      ...createDeflectionTools(interceptorCtx.registry),
    ];
    const agent = createAgent({ db, tools, interceptor: interceptorCtx });

    try {
      await executeRun(db, agent, config, {
        prompt: args.prompt as string | undefined,
        session: args.session as string | undefined,
        model: args.model as string | undefined,
        noStream: args["no-stream"] as boolean | undefined,
      });
    } finally {
      codexDb.close();
      db.close();
    }
  },
});

const sessionsCommand = defineCommand({
  meta: { name: "sessions", description: "List all sessions" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const result = await registry.execute("sessions", "", { db, homePath, sessionId: null });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const modelCommand = defineCommand({
  meta: { name: "model", description: "Show or change the default model" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    name: { type: "positional", description: "Model name to set", required: false },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const modelArg = (args.name as string) ?? "";
      const result = await registry.execute("model", modelArg, { db, homePath, sessionId: null });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const configCommand = defineCommand({
  meta: { name: "config", description: "Show or edit config" },
  args: {
    home: { type: "string", description: "Ghostpaw home directory" },
    key: { type: "positional", description: "Config key", required: false },
    value: { type: "positional", description: "Config value", required: false },
  },
  async run({ args }) {
    const { homePath } = initShared(args);
    const db = await openDatabase(homePath);
    const registry = createRegistry();
    registerBuiltins(registry);
    try {
      const configArgs = [args.key, args.value].filter(Boolean).join(" ");
      const result = await registry.execute("config", configArgs, {
        db,
        homePath,
        sessionId: null,
      });
      console.log(result.text);
    } finally {
      db.close();
    }
  },
});

const main = defineCommand({
  meta: {
    name: "ghostpaw",
    version: VERSION,
    description: "Single-process AI agent runtime",
  },
  args: {
    home: {
      type: "string",
      description: "Path to ghostpaw home directory (default: ~/.ghostpaw)",
    },
    workspace: {
      type: "string",
      description: "Working directory for file tools (default: cwd)",
    },
  },
  subCommands: {
    run: runCommand,
    sessions: sessionsCommand,
    model: modelCommand,
    config: configCommand,
  },
  async run({ args }) {
    // citty falls through to parent run() after a subcommand — bail out
    const subCmds = new Set(["run", "sessions", "model", "config"]);
    const firstPositional = process.argv.slice(2).find((a) => !a.startsWith("-"));
    if (firstPositional && subCmds.has(firstPositional)) return;

    if (!process.stdin.isTTY) {
      console.error(
        "error: no TTY detected and no subcommand given. Use 'ghostpaw run' for non-interactive mode.",
      );
      process.exit(1);
    }

    const homePath = resolveHome({ home: args.home as string | undefined });
    ensureHome(homePath);

    const config = readConfig(homePath);
    applyApiKeys(config);
    applyModels(config);
    config.model = resolveModel(config);
    if (!ensureApiKey(config, homePath)) process.exit(1);

    const workspace = (args.workspace as string) || process.env.GHOSTPAW_WORKSPACE || process.cwd();
    const db = await openDatabase(homePath);
    const codexDb = await openCodexDatabase(homePath);
    const scrubValues = Object.values(config.api_keys).filter(Boolean);
    const interceptorCtx = buildInterceptorContext(config, codexDb);
    const tools = [
      ...createTools(workspace, scrubValues),
      ...createDeflectionTools(interceptorCtx.registry),
    ];
    const agent = createAgent({ db, tools, interceptor: interceptorCtx });
    const registry = createRegistry();
    registerBuiltins(registry);

    try {
      await runTui(db, agent, registry, config, homePath);
    } finally {
      codexDb.close();
      db.close();
    }
  },
});

runMain(main);
